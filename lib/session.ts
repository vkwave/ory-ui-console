import "server-only"

import { randomBytes } from "node:crypto"

import { getIronSession, type SessionOptions } from "iron-session"
import { cookies } from "next/headers"

import { loadConfig } from "@/lib/config"

export interface SessionData {
  pending?: {
    state: string
    nonce: string
    codeVerifier: string
    createdAt: number
  }
  admin?: {
    subject: string
    acr: string
    roles: string[]
    authenticatedAt: number
    roleCheckedAt: number
    csrfToken: string
  }
}

export const sessionOptions = (
  env: NodeJS.ProcessEnv = process.env,
): SessionOptions => {
  const config = loadConfig(env)
  return {
    cookieName: config.sessionCookieName,
    password: config.sessionSecret,
    ttl: 8 * 60 * 60,
    cookieOptions: {
      secure: config.secureCookie,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  }
}

export const getSession = async () =>
  getIronSession<SessionData>(await cookies(), sessionOptions())

export const newCSRFToken = (): string =>
  randomBytes(32).toString("base64url")
