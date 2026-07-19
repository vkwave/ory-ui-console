import "server-only"

import { isIP } from "node:net"

import type { OAuth2Client } from "@ory/client"
import { z } from "zod"

const grantType = z.enum([
  "authorization_code",
  "refresh_token",
  "client_credentials",
])
const responseType = z.enum(["code"])
const tokenEndpointAuthMethod = z.enum([
  "client_secret_basic",
  "client_secret_post",
  "private_key_jwt",
  "none",
])

const duplicate = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length

const privateIPv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }
  const [first, second] = parts
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

const privateIPv6 = (hostname: string): boolean => {
  const value = hostname.toLowerCase()
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    /^fe[89ab]/.test(value) ||
    value.startsWith("::ffff:")
  )
}

const safeRedirect = (value: string): boolean => {
  if (value.includes("*")) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.username || url.password || url.hash) return false

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  const loopback = hostname === "127.0.0.1" || hostname === "::1"
  if (url.protocol === "http:") {
    return loopback && url.port !== ""
  }
  if (url.protocol !== "https:") return false
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false
  }
  if (isIP(hostname) === 4 && privateIPv4(hostname)) return false
  if (isIP(hostname) === 6 && privateIPv6(hostname)) return false
  return true
}

const scopeTokens = (scope: string): string[] =>
  scope.trim() === "" ? [] : scope.trim().split(/\s+/)

export const oauthClientFormSchema = z
  .object({
    client_id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[\x21\x23-\x5B\x5D-\x7E]+$/, "invalid client ID"),
    client_name: z.string().trim().min(1).max(128),
    redirect_uris: z.array(z.url()).max(20),
    grant_types: z.array(grantType).min(1).max(3),
    response_types: z.array(responseType).max(1),
    scope: z.string().trim().max(2_048),
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    audience: z.array(z.url()).max(20),
  })
  .strict()
  .superRefine((client, context) => {
    if (duplicate(client.redirect_uris)) {
      context.addIssue({
        code: "custom",
        path: ["redirect_uris"],
        message: "duplicate redirect URI",
      })
    }
    for (const redirectURI of client.redirect_uris) {
      if (!safeRedirect(redirectURI)) {
        context.addIssue({
          code: "custom",
          path: ["redirect_uris"],
          message: "unsafe redirect URI",
        })
      }
    }

    const scopes = scopeTokens(client.scope)
    if (duplicate(scopes)) {
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: "duplicate scope",
      })
    }
    if (duplicate(client.grant_types)) {
      context.addIssue({
        code: "custom",
        path: ["grant_types"],
        message: "duplicate grant type",
      })
    }
    if (duplicate(client.response_types)) {
      context.addIssue({
        code: "custom",
        path: ["response_types"],
        message: "duplicate response type",
      })
    }
    if (duplicate(client.audience)) {
      context.addIssue({
        code: "custom",
        path: ["audience"],
        message: "duplicate audience",
      })
    }

    const authorizationCode = client.grant_types.includes("authorization_code")
    if (
      authorizationCode !== client.response_types.includes("code") ||
      (authorizationCode && client.redirect_uris.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["grant_types"],
        message: "authorization code clients require code response and redirects",
      })
    }
    if (
      client.grant_types.includes("refresh_token") &&
      !authorizationCode
    ) {
      context.addIssue({
        code: "custom",
        path: ["grant_types"],
        message: "refresh tokens require authorization code",
      })
    }
    if (
      client.token_endpoint_auth_method === "none" &&
      (!authorizationCode || client.grant_types.includes("client_credentials"))
    ) {
      context.addIssue({
        code: "custom",
        path: ["token_endpoint_auth_method"],
        message: "public client must use the authorization code flow",
      })
    }
  })

export type OAuthClientForm = z.infer<typeof oauthClientFormSchema>

export const parseOAuthClientForm = (input: unknown): OAuth2Client => {
  const client = oauthClientFormSchema.parse(input)
  return { ...client, scope: scopeTokens(client.scope).join(" ") }
}
