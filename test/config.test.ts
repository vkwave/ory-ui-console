import { describe, expect, it } from "vitest"

import { loadConfig } from "@/lib/config"

import { validEnv } from "./env"

describe("console configuration", () => {
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
