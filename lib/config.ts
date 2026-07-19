import "server-only"

import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  AUTH_ADMIN_URL: z.url(),
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(32),
  OIDC_REDIRECT_URI: z.url(),
  OIDC_REQUIRED_ACR: z.string().min(1).default("aal2"),
  HYDRA_PUBLIC_URL: z.url(),
  HYDRA_ADMIN_URL: z.url(),
  KRATOS_ADMIN_URL: z.url(),
  ADAPTER_INTERNAL_URL: z.url(),
  ADAPTER_CONSOLE_CLIENT_ID: z.string().min(1),
  ADAPTER_CONSOLE_CLIENT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1),
  ADMIN_ROLE: z.string().min(1).default("auth_admin"),
  SECURITY_OPERATOR_ROLE: z.string().min(1).default("security_operator"),
  ROLE_RECHECK_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  CONSOLE_ALLOW_INSECURE_DEV: z.enum(["true", "false"]).default("false"),
})

export interface ConsoleConfig {
  production: boolean
  adminOrigin: URL
  issuer: URL
  authorizationEndpoint: URL
  tokenEndpoint: URL
  jwksEndpoint: URL
  userInfoEndpoint: URL
  hydraAdminURL: URL
  kratosAdminURL: URL
  adapterInternalURL: URL
  clientID: string
  clientSecret: string
  redirectURI: string
  requiredAcr: string
  sessionSecret: string
  sessionCookieName: string
  secureCookie: boolean
  adminRole: string
  securityOperatorRole: string
  roleRecheckSeconds: number
  adapterClientID: string
  adapterClientSecret: string
}

const endpoint = (base: string, path: string): URL =>
  new URL(path, new URL(base).origin)

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ConsoleConfig => {
  const value = schema.parse(env)
  const production = value.NODE_ENV === "production"
  const allowInsecure = value.CONSOLE_ALLOW_INSECURE_DEV === "true"
  const adminOrigin = new URL(value.AUTH_ADMIN_URL)
  const redirect = new URL(value.OIDC_REDIRECT_URI)
  const issuer = new URL(value.OIDC_ISSUER)

  if (
    redirect.origin !== adminOrigin.origin ||
    redirect.pathname !== "/api/auth/callback"
  ) {
    throw new Error(
      "OIDC redirect URI origin or path does not match the admin console",
    )
  }
  if (
    production &&
    (allowInsecure ||
      adminOrigin.protocol !== "https:" ||
      issuer.protocol !== "https:")
  ) {
    throw new Error("production console origins must use HTTPS")
  }
  if (production && !value.SESSION_COOKIE_NAME.startsWith("__Host-")) {
    throw new Error("production session cookie must use the __Host- prefix")
  }

  return {
    production,
    adminOrigin,
    issuer,
    authorizationEndpoint: endpoint(value.OIDC_ISSUER, "/oauth2/auth"),
    tokenEndpoint: endpoint(value.HYDRA_PUBLIC_URL, "/oauth2/token"),
    jwksEndpoint: endpoint(value.HYDRA_PUBLIC_URL, "/.well-known/jwks.json"),
    userInfoEndpoint: endpoint(value.HYDRA_PUBLIC_URL, "/userinfo"),
    hydraAdminURL: new URL(value.HYDRA_ADMIN_URL),
    kratosAdminURL: new URL(value.KRATOS_ADMIN_URL),
    adapterInternalURL: new URL(value.ADAPTER_INTERNAL_URL),
    clientID: value.OIDC_CLIENT_ID,
    clientSecret: value.OIDC_CLIENT_SECRET,
    redirectURI: redirect.href,
    requiredAcr: value.OIDC_REQUIRED_ACR,
    sessionSecret: value.SESSION_SECRET,
    sessionCookieName: value.SESSION_COOKIE_NAME,
    secureCookie: production || !allowInsecure,
    adminRole: value.ADMIN_ROLE,
    securityOperatorRole: value.SECURITY_OPERATOR_ROLE,
    roleRecheckSeconds: value.ROLE_RECHECK_SECONDS,
    adapterClientID: value.ADAPTER_CONSOLE_CLIENT_ID,
    adapterClientSecret: value.ADAPTER_CONSOLE_CLIENT_SECRET,
  }
}
