// @vitest-environment node

import { sealData } from "iron-session"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { proxy } from "@/proxy"

import { validEnv } from "./env"

describe("console proxy", () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries(validEnv)) {
      vi.stubEnv(name, value!)
    }
  })

  afterEach(() => vi.unstubAllEnvs())

  it("keeps auth routes public and rejects unauthenticated APIs", async () => {
    const publicResponse = await proxy(
      new NextRequest("https://auth-admin.example.test/api/auth/start"),
    )
    expect(publicResponse.headers.get("x-middleware-next")).toBe("1")

    const apiResponse = await proxy(
      new NextRequest("https://auth-admin.example.test/api/hydra/clients"),
    )
    expect(apiResponse.status).toBe(401)

    const dashboardResponse = await proxy(
      new NextRequest("https://auth-admin.example.test/dashboard"),
    )
    expect(dashboardResponse.headers.get("location")).toBe(
      "https://auth-admin.example.test/login",
    )
  })

  it("passes an encrypted administrator session optimistically", async () => {
    const session = await sealData(
      {
        admin: {
          subject: "identity-1",
          acr: "aal2",
          roles: ["auth_admin"],
          authenticatedAt: 1_700_000_000_000,
          roleCheckedAt: 1_700_000_000_000,
          csrfToken: "csrf-token",
        },
      },
      { password: validEnv.SESSION_SECRET!, ttl: 8 * 60 * 60 },
    )
    const request = new NextRequest(
      "https://auth-admin.example.test/dashboard",
      { headers: { cookie: `vkwave_admin_test=${session}` } },
    )

    const response = await proxy(request)

    expect(response.headers.get("x-middleware-next")).toBe("1")
  })
})
