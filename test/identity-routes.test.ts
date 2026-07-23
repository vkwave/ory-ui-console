// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  deleteIdentity: vi.fn(),
  requireMutation: vi.fn(),
  runAuditedOperation: vi.fn(),
}))

vi.mock("@/lib/kratos/identity-operations", () => ({
  identityOperations: { delete: mocks.deleteIdentity },
}))
vi.mock("@/lib/security/request", () => ({
  requireMutation: mocks.requireMutation,
}))
vi.mock("@/lib/security/operation", () => ({
  runAuditedOperation: mocks.runAuditedOperation,
}))

import { DELETE as deleteIdentity } from "@/app/api/kratos/identities/[id]/route"

describe("identity mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireMutation.mockResolvedValue({
      admin: {
        subject: "identity-operator",
        roles: ["auth_admin"],
        csrfToken: "csrf",
      },
      idempotencyKey: "request_key_123456",
      body: { confirmation: "identity-1" },
    })
    mocks.runAuditedOperation.mockImplementation(
      async ({ operation }: { operation: () => Promise<unknown> }) =>
        operation(),
    )
    mocks.deleteIdentity.mockResolvedValue(null)
  })

  it("passes confirmed deletion and the actor through the mutation boundary", async () => {
    const request = new Request(
      "https://auth-admin.example.test/api/kratos/identities/identity-1",
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "identity-1" }),
      },
    )
    const response = await deleteIdentity(request, {
      params: Promise.resolve({ id: "identity-1" }),
    })

    expect(response.status).toBe(200)
    expect(mocks.requireMutation).toHaveBeenCalledOnce()
    expect(mocks.deleteIdentity).toHaveBeenCalledWith(
      "identity-1",
      "identity-1",
      "identity-operator",
    )
  })
})
