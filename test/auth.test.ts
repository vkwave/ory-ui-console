// @vitest-environment node

import { createHash } from "node:crypto"

import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { describe, expect, it, type Mock, vi } from "vitest"

import {
  beginAuthorization,
  completeAuthorization,
  validateIDToken,
} from "@/lib/auth/oidc"
import { pkceChallenge } from "@/lib/auth/pkce"
import { resolveAdministrator } from "@/lib/auth/roles"
import { sessionOptions, type SessionData } from "@/lib/session"

import { validEnv } from "./env"

describe("administrator OIDC", () => {
  it("requires issuer, audience, nonce, and aal2", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    const token = await new SignJWT({ nonce: "n-1", acr: "aal2" })
      .setProtectedHeader({ alg: "RS256", kid: "k-1" })
      .setIssuer(validEnv.OIDC_ISSUER!)
      .setAudience(validEnv.OIDC_CLIENT_ID!)
      .setSubject("identity-1")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)

    const jwks = {
      keys: [{ ...jwk, kid: "k-1", alg: "RS256", use: "sig" }],
    }
    const claims = await validateIDToken(token, "n-1", {
      env: validEnv,
      jwks,
    })

    expect(claims.sub).toBe("identity-1")
    await expect(
      validateIDToken(token, "wrong", { env: validEnv, jwks }),
    ).rejects.toThrow(/nonce|assurance/)
  })

  it("rejects an inactive identity or missing auth_admin role", async () => {
    const inactiveFetch = vi.fn().mockResolvedValue(
      Response.json({
        id: "identity-1",
        state: "inactive",
        metadata_admin: { roles: ["auth_admin"] },
      }),
    )
    await expect(
      resolveAdministrator("identity-1", {
        env: validEnv,
        fetch: inactiveFetch,
      }),
    ).rejects.toThrow(/inactive/)

    const nonAdminFetch = vi.fn().mockResolvedValue(
      Response.json({
        id: "identity-1",
        state: "active",
        metadata_admin: { roles: ["security_operator"] },
      }),
    )
    await expect(
      resolveAdministrator("identity-1", {
        env: validEnv,
        fetch: nonAdminFetch,
      }),
    ).rejects.toThrow(/role is missing/)
  })

  it("derives the RFC 7636 S256 challenge", () => {
    const verifier = "test-verifier-with-sufficient-entropy-for-pkce"
    const expected = createHash("sha256")
      .update(verifier, "ascii")
      .digest("base64url")

    expect(pkceChallenge(verifier)).toBe(expected)
  })

  it("starts authorization at the public issuer with PKCE and a pending session", async () => {
    const session: SessionData & { save: Mock<() => Promise<void>> } = {
      save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }
    const random = vi
      .fn()
      .mockReturnValueOnce("state-1")
      .mockReturnValueOnce("nonce-1")
      .mockReturnValueOnce("verifier-1")

    const url = await beginAuthorization({
      env: validEnv,
      getSession: async () => session,
      randomURLSafe: random,
      now: () => 1_700_000_000_000,
    })

    expect(url.origin).toBe("https://auth.example.test")
    expect(url.pathname).toBe("/oauth2/auth")
    expect(url.searchParams.get("client_id")).toBe("vkwave-auth-admin")
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://auth-admin.example.test/api/auth/callback",
    )
    expect(url.searchParams.get("state")).toBe("state-1")
    expect(url.searchParams.get("nonce")).toBe("nonce-1")
    expect(url.searchParams.get("code_challenge")).toBe(
      pkceChallenge("verifier-1"),
    )
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("acr_values")).toBe("aal2")
    expect(session.pending).toEqual({
      state: "state-1",
      nonce: "nonce-1",
      codeVerifier: "verifier-1",
      createdAt: 1_700_000_000_000,
    })
    expect(session.save).toHaveBeenCalledOnce()
  })

  it("completes authorization without persisting provider tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    const idToken = await new SignJWT({ nonce: "nonce-1", acr: "aal2" })
      .setProtectedHeader({ alg: "RS256", kid: "k-1" })
      .setIssuer(validEnv.OIDC_ISSUER!)
      .setAudience(validEnv.OIDC_CLIENT_ID!)
      .setSubject("identity-1")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey)
    const session: SessionData & { save: Mock<() => Promise<void>> } = {
      pending: {
        state: "state-1",
        nonce: "nonce-1",
        codeVerifier: "verifier-1",
        createdAt: 1_700_000_000_000,
      },
      save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url === "http://hydra-public:4444/oauth2/token") {
        return Response.json({
          id_token: idToken,
          access_token: "access-token-must-not-survive",
        })
      }
      if (url === "http://hydra-public:4444/userinfo") {
        return Response.json({ sub: "identity-1" })
      }
      if (url === "http://kratos-admin:4434/admin/identities/identity-1") {
        return Response.json({
          id: "identity-1",
          state: "active",
          metadata_admin: { roles: ["auth_admin"] },
        })
      }
      return new Response(null, { status: 404 })
    }) as typeof fetch

    await completeAuthorization("code-1", "state-1", {
      env: validEnv,
      fetch: fetchMock,
      getSession: async () => session,
      jwks: { keys: [{ ...jwk, kid: "k-1", alg: "RS256", use: "sig" }] },
      now: () => 1_700_000_001_000,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(vi.mocked(fetchMock).mock.calls[0][0])).toBe(
      "http://hydra-public:4444/oauth2/token",
    )
    expect(String(vi.mocked(fetchMock).mock.calls[1][0])).toBe(
      "http://hydra-public:4444/userinfo",
    )
    expect(String(vi.mocked(fetchMock).mock.calls[2][0])).toBe(
      "http://kratos-admin:4434/admin/identities/identity-1",
    )
    expect(session.pending).toBeUndefined()
    expect(session.admin).toMatchObject({
      subject: "identity-1",
      acr: "aal2",
      roles: ["auth_admin"],
      authenticatedAt: 1_700_000_001_000,
      roleCheckedAt: 1_700_000_001_000,
    })
    expect(session.admin?.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(JSON.stringify(session)).not.toContain("access-token-must-not-survive")
    expect(session.save).toHaveBeenCalledTimes(2)
    expect(session.save.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(fetchMock).mock.invocationCallOrder[0],
    )
  })

  it("uses an encrypted host-only session cookie", () => {
    const options = sessionOptions(validEnv)

    expect(options.cookieName).toBe("vkwave_admin_test")
    expect(options.password).toBe("console-session-secret-32-characters")
    expect(options.cookieOptions).toMatchObject({
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
    expect(options.cookieOptions).not.toHaveProperty("domain")
  })
})
