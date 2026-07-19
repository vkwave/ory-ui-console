// @vitest-environment node

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  beginAuthorization: vi.fn(),
  completeAuthorization: vi.fn(),
  destroy: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/auth/oidc", () => ({
  beginAuthorization: mocks.beginAuthorization,
  completeAuthorization: mocks.completeAuthorization,
}))
vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))

import { GET as callback } from "@/app/api/auth/callback/route"
import { POST as logout } from "@/app/api/auth/logout/route"
import { GET as start } from "@/app/api/auth/start/route"

describe("administrator auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.beginAuthorization.mockResolvedValue(
      new URL("https://auth.example.test/oauth2/auth?state=state-1"),
    )
    mocks.completeAuthorization.mockResolvedValue(undefined)
    mocks.getSession.mockResolvedValue({ destroy: mocks.destroy })
  })

  it("redirects the start route only to the authorization URL", async () => {
    const response = await start()

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://auth.example.test/oauth2/auth?state=state-1",
    )
  })

  it("rejects duplicate callback values without exchanging a code", async () => {
    const response = await callback(
      new NextRequest(
        "https://auth-admin.example.test/api/auth/callback?code=a&code=b&state=s",
      ),
    )

    expect(response.status).toBe(400)
    expect(mocks.completeAuthorization).not.toHaveBeenCalled()
  })

  it("uses fixed callback destinations and destroys sessions on logout", async () => {
    const failed = await callback(
      new NextRequest(
        "https://auth-admin.example.test/api/auth/callback?error=access_denied&error_description=raw-secret",
      ),
    )
    expect(failed.headers.get("location")).toBe(
      "https://auth-admin.example.test/login?error=oauth_callback",
    )
    expect(failed.headers.get("location")).not.toContain("raw-secret")

    const succeeded = await callback(
      new NextRequest(
        "https://auth-admin.example.test/api/auth/callback?code=code-1&state=state-1",
      ),
    )
    expect(mocks.completeAuthorization).toHaveBeenCalledWith(
      "code-1",
      "state-1",
    )
    expect(succeeded.headers.get("location")).toBe(
      "https://auth-admin.example.test/dashboard",
    )

    const loggedOut = await logout()
    expect(loggedOut.status).toBe(204)
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })
})
