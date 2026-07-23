// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

import {
  createIdentityOperations,
  IdentityOperationError,
} from "@/lib/kratos/identity-operations"
import { maskCourierRecipient } from "@/lib/kratos/recipient"
import { safeErrorResponse } from "@/lib/security/errors"

const identity = (overrides: Record<string, unknown> = {}) => ({
  id: "identity-1",
  schema_id: "default",
  schema_url: "https://schemas.example.test/default",
  state: "active",
  traits: { email: "must-not-enter-audit@example.test" },
  metadata_public: { locale: "en" },
  metadata_admin: { roles: ["auth_admin"], retained: "keep-me" },
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z",
  ...overrides,
})

const dependencies = () => {
  const kratos = {
    getIdentity: vi.fn().mockResolvedValue(identity()),
    listIdentities: vi.fn().mockResolvedValue([identity()]),
    updateIdentity: vi.fn().mockImplementation(async (_id, body) => ({
      ...identity(),
      ...body,
    })),
    revokeAllSessions: vi.fn().mockResolvedValue({ count: 1 }),
    deleteIdentity: vi.fn().mockResolvedValue(null),
  }
  const hydra = {
    revokeAllConsentForSubject: vi.fn().mockResolvedValue(null),
  }
  return { kratos, hydra }
}

describe("Kratos identity operations", () => {
  it("preserves unrelated metadata while updating allowlisted roles", async () => {
    const deps = dependencies()
    const operations = createIdentityOperations(deps)

    await operations.updateRoles("identity-1", [
      "auth_admin",
      "security_operator",
    ])

    expect(deps.kratos.getIdentity).toHaveBeenCalledWith("identity-1")
    expect(deps.kratos.updateIdentity).toHaveBeenCalledWith("identity-1", {
      schema_id: "default",
      state: "active",
      traits: { email: "must-not-enter-audit@example.test" },
      metadata_public: { locale: "en" },
      metadata_admin: {
        retained: "keep-me",
        roles: ["auth_admin", "security_operator"],
      },
    })
    expect(
      JSON.stringify(deps.kratos.updateIdentity.mock.calls[0][1]),
    ).not.toContain("credentials")
  })

  it("rejects unknown roles and removal of the last active administrator", async () => {
    const deps = dependencies()
    const operations = createIdentityOperations(deps)

    await expect(
      operations.updateRoles("identity-1", ["owner"]),
    ).rejects.toThrow(/invalid_identity_role/)
    await expect(
      operations.updateRoles("identity-1", ["security_operator"]),
    ).rejects.toThrow(/last_active_auth_admin/)
    expect(deps.kratos.updateIdentity).not.toHaveBeenCalled()
  })

  it("allows demotion when another active administrator remains", async () => {
    const deps = dependencies()
    deps.kratos.listIdentities.mockResolvedValue([
      identity(),
      identity({ id: "identity-2" }),
    ])
    const operations = createIdentityOperations(deps)

    await expect(
      operations.updateRoles("identity-1", ["security_operator"]),
    ).resolves.toBeDefined()
    expect(deps.kratos.updateIdentity).toHaveBeenCalledOnce()
  })

  it("prevents self-deletion and deletion of the last active administrator", async () => {
    const deps = dependencies()
    const operations = createIdentityOperations(deps)

    await expect(
      operations.delete("identity-1", "identity-1", "identity-1"),
    ).rejects.toThrow(/administrator_cannot_delete_self/)
    await expect(
      operations.delete("identity-1", "identity-1", "identity-operator"),
    ).rejects.toThrow(/last_active_auth_admin/)
    expect(deps.kratos.deleteIdentity).not.toHaveBeenCalled()
  })

  it("revokes sessions and consents before confirmed identity deletion", async () => {
    const deps = dependencies()
    deps.kratos.getIdentity.mockResolvedValue(
      identity({
        id: "identity-2",
        metadata_admin: { retained: "keep-me", roles: [] },
      }),
    )
    const operations = createIdentityOperations(deps)

    await expect(
      operations.delete("identity-2", "identity-2", "identity-operator"),
    ).resolves.toBeNull()
    expect(deps.kratos.revokeAllSessions).toHaveBeenCalledWith("identity-2")
    expect(deps.hydra.revokeAllConsentForSubject).toHaveBeenCalledWith(
      "identity-2",
    )
    expect(deps.kratos.deleteIdentity).toHaveBeenCalledWith("identity-2")
    expect(
      deps.kratos.revokeAllSessions.mock.invocationCallOrder[0],
    ).toBeLessThan(deps.kratos.deleteIdentity.mock.invocationCallOrder[0])
    expect(
      deps.hydra.revokeAllConsentForSubject.mock.invocationCallOrder[0],
    ).toBeLessThan(deps.kratos.deleteIdentity.mock.invocationCallOrder[0])
  })

  it("accepts only active or inactive identity state transitions", async () => {
    const deps = dependencies()
    deps.kratos.listIdentities.mockResolvedValue([
      identity(),
      identity({ id: "identity-2" }),
    ])
    const operations = createIdentityOperations(deps)

    await expect(
      operations.updateState("identity-1", "inactive"),
    ).resolves.toBeDefined()
    await expect(
      operations.updateState("identity-1", "deleted"),
    ).rejects.toThrow(/invalid_identity_state/)
  })
})

describe("courier recipient masking", () => {
  it.each([
    ["alice@example.test", "a***@example.test"],
    ["+14155550123", "+*********23"],
    ["opaque-recipient", "o***"],
  ])("masks %s", (recipient, expected) => {
    expect(maskCourierRecipient(recipient)).toBe(expected)
  })
})

describe("identity operation HTTP errors", () => {
  it("returns only the stable operation code", async () => {
    const response = safeErrorResponse(
      new IdentityOperationError("last_active_auth_admin"),
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "last_active_auth_admin" })
  })
})
