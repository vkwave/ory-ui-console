// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  rotate: vi.fn(),
  requireMutation: vi.fn(),
  runAuditedOperation: vi.fn(),
}))

vi.mock("@/lib/hydra/client-operations", () => ({
  clientOperations: { rotate: mocks.rotate },
}))
vi.mock("@/lib/security/request", () => ({
  requireMutation: mocks.requireMutation,
}))
vi.mock("@/lib/security/operation", () => ({
  runAuditedOperation: mocks.runAuditedOperation,
}))

import { POST as rotateClient } from "@/app/api/hydra/clients/[id]/rotate/route"

const request = new Request(
  "https://auth-admin.example.test/api/hydra/clients/client-1/rotate",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  },
)
const context = { params: Promise.resolve({ id: "client-1" }) }

describe("OAuth client mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireMutation.mockResolvedValue({
      admin: {
        subject: "identity-1",
        roles: ["auth_admin"],
        csrfToken: "csrf",
      },
      idempotencyKey: "request_key_123456",
      body: {},
    })
    mocks.runAuditedOperation.mockImplementation(
      async ({ operation }: { operation: () => Promise<unknown> }) =>
        operation(),
    )
  })

  it("fails closed when Hydra does not return the rotated secret", async () => {
    mocks.rotate.mockResolvedValue({ client_id: "client-1" })

    const response = await rotateClient(request, context)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "rotation_secret_missing" })
  })

  it("returns the new secret once with no-store", async () => {
    mocks.rotate.mockResolvedValue({
      client_id: "client-1",
      client_secret: "one-time-secret",
    })

    const response = await rotateClient(request, context)

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({
      client_id: "client-1",
      client_secret: "one-time-secret",
    })
  })
})
