import { describe, expect, it } from "vitest"

import { loadConfig } from "@/lib/config"

import { validEnv } from "./env"

describe("console configuration", () => {
  it("uses the explicit development policy in a production-built runtime", () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: "production",
      CONSOLE_DEPLOYMENT_MODE: "development",
      AUTH_ADMIN_URL: "http://auth-admin.localhost:18081",
      OIDC_ISSUER: "http://auth.localhost:18080",
      OIDC_REDIRECT_URI:
        "http://auth-admin.localhost:18081/api/auth/callback",
      SESSION_COOKIE_NAME: "vkwave_admin_dev",
      CONSOLE_ALLOW_INSECURE_DEV: "true",
    })

    expect(config.production).toBe(false)
    expect(config.secureCookie).toBe(false)
  })

  it("keeps the explicit and default production policies fail-closed", () => {
    const insecureEnvironment: NodeJS.ProcessEnv = {
      ...validEnv,
      NODE_ENV: "development",
      AUTH_ADMIN_URL: "http://auth-admin.localhost:18081",
      OIDC_ISSUER: "http://auth.localhost:18080",
      OIDC_REDIRECT_URI:
        "http://auth-admin.localhost:18081/api/auth/callback",
      SESSION_COOKIE_NAME: "vkwave_admin_dev",
      CONSOLE_ALLOW_INSECURE_DEV: "true",
    }

    expect(() =>
      loadConfig({
        ...insecureEnvironment,
        CONSOLE_DEPLOYMENT_MODE: "production",
      }),
    ).toThrow(/production console origins must use HTTPS/)
    expect(() =>
      loadConfig({
        ...insecureEnvironment,
        CONSOLE_DEPLOYMENT_MODE: undefined,
      }),
    ).toThrow(/production console origins must use HTTPS/)
  })

  it("derives fixed internal and public endpoints", () => {
    const config = loadConfig(validEnv)

    expect(config.authorizationEndpoint.href).toBe(
      "https://auth.example.test/oauth2/auth",
    )
    expect(config.tokenEndpoint.href).toBe(
      "http://hydra-public:4444/oauth2/token",
    )
    expect(config.jwksEndpoint.href).toBe(
      "http://hydra-public:4444/.well-known/jwks.json",
    )
  })

  it("rejects a production non-host cookie or redirect mismatch", () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        NODE_ENV: "production",
        CONSOLE_DEPLOYMENT_MODE: "production",
        CONSOLE_ALLOW_INSECURE_DEV: "false",
        SESSION_COOKIE_NAME: "vkwave_admin",
      }),
    ).toThrow(/__Host-/)
    expect(() =>
      loadConfig({
        ...validEnv,
        OIDC_REDIRECT_URI: "https://evil.example/callback",
      }),
    ).toThrow(/redirect URI origin/)
  })
})
