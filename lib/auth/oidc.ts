import "server-only"

import {
  createLocalJWKSet,
  type JSONWebKeySet,
  type JWTPayload,
  jwtVerify,
} from "jose"

import { loadConfig } from "@/lib/config"
import {
  getSession,
  newCSRFToken,
  type SessionData,
} from "@/lib/session"

import { pkceChallenge, randomURLSafe } from "./pkce"
import { resolveAdministrator } from "./roles"

interface SessionStore extends SessionData {
  save(): Promise<void>
}

interface OIDCDependencies {
  env?: NodeJS.ProcessEnv
  fetch?: typeof fetch
  getSession?: () => Promise<SessionStore>
  jwks?: JSONWebKeySet
  now?: () => number
  randomURLSafe?: (bytes?: number) => string
}

export const beginAuthorization = async (
  overrides: OIDCDependencies = {},
): Promise<URL> => {
  const config = loadConfig(overrides.env)
  const session = await (overrides.getSession ?? getSession)()
  const random = overrides.randomURLSafe ?? randomURLSafe
  const now = overrides.now ?? Date.now
  const state = random()
  const nonce = random()
  const codeVerifier = random(48)

  session.pending = {
    state,
    nonce,
    codeVerifier,
    createdAt: now(),
  }
  await session.save()

  const url = new URL(config.authorizationEndpoint)
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientID,
    redirect_uri: config.redirectURI,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: "S256",
    acr_values: config.requiredAcr,
    prompt: "login",
  }).toString()
  return url
}

export const validateIDToken = async (
  token: string,
  nonce: string,
  overrides?: {
    env?: NodeJS.ProcessEnv
    fetch?: typeof fetch
    jwks?: JSONWebKeySet
  },
): Promise<JWTPayload> => {
  const config = loadConfig(overrides?.env)
  const doFetch = overrides?.fetch ?? fetch
  let jwks = overrides?.jwks
  if (!jwks) {
    jwks = await doFetch(config.jwksEndpoint, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error("OIDC JWKS request failed")
      return (await response.json()) as JSONWebKeySet
    })
  }
  if (!jwks) throw new Error("OIDC JWKS response is incomplete")
  const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
    issuer: config.issuer.href.replace(/\/$/, ""),
    audience: config.clientID,
    requiredClaims: ["sub", "exp", "iat", "nonce", "acr"],
    clockTolerance: 30,
  })
  if (payload.nonce !== nonce || payload.acr !== config.requiredAcr) {
    throw new Error("OIDC nonce or assurance level is invalid")
  }
  return payload
}

export const completeAuthorization = async (
  code: string,
  state: string,
  overrides: OIDCDependencies = {},
): Promise<void> => {
  const config = loadConfig(overrides.env)
  const session = await (overrides.getSession ?? getSession)()
  const doFetch = overrides.fetch ?? fetch
  const now = overrides.now ?? Date.now
  const pending = session.pending

  delete session.pending
  await session.save()
  if (
    !pending ||
    pending.state !== state ||
    now() - pending.createdAt > 10 * 60_000
  ) {
    throw new Error("OIDC state is invalid or expired")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectURI,
    code_verifier: pending.codeVerifier,
  })
  const authorization = Buffer.from(
    `${config.clientID}:${config.clientSecret}`,
  ).toString("base64")
  const response = await doFetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error("OIDC code exchange failed")
  const tokens = (await response.json()) as {
    id_token?: string
    access_token?: string
  }
  if (!tokens.id_token || !tokens.access_token) {
    throw new Error("OIDC response is incomplete")
  }

  const claims = await validateIDToken(tokens.id_token, pending.nonce, {
    env: overrides.env,
    fetch: doFetch,
    jwks: overrides.jwks,
  })
  const subject = String(claims.sub)
  const userInfo = await doFetch(config.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  }).then(async (result) =>
    result.ok ? ((await result.json()) as { sub?: string }) : null,
  )
  if (!userInfo || userInfo.sub !== subject) {
    throw new Error("OIDC UserInfo subject mismatch")
  }

  const administrator = await resolveAdministrator(subject, {
    env: overrides.env,
    fetch: doFetch,
  })
  const authenticatedAt = now()
  session.admin = {
    subject,
    acr: String(claims.acr),
    roles: administrator.roles,
    authenticatedAt,
    roleCheckedAt: authenticatedAt,
    csrfToken: newCSRFToken(),
  }
  await session.save()
}
