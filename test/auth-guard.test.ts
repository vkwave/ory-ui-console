// @vitest-environment node

import { describe, expect, it, type Mock, vi } from "vitest"

import { requireAdmin } from "@/lib/auth/require-admin"
import type { SessionData } from "@/lib/session"

import { validEnv } from "./env"

describe("administrator session guard", () => {
  it("rechecks the active Kratos role for sensitive operations", async () => {
    const session: SessionData & {
      destroy: Mock<() => void>
      save: Mock<() => Promise<void>>
    } = {
      admin: {
        subject: "identity-1",
        acr: "aal2",
        roles: ["auth_admin"],
        authenticatedAt: 1_700_000_000_000,
        roleCheckedAt: 1_700_000_000_000,
        csrfToken: "csrf-token",
      },
      destroy: vi.fn<() => void>(),
      save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }
    const resolver = vi.fn().mockResolvedValue({
      subject: "identity-1",
      roles: ["auth_admin", "security_operator"],
    })

    const admin = await requireAdmin(true, {
      env: validEnv,
      getSession: async () => session,
      now: () => 1_700_000_100_000,
      resolveAdministrator: resolver,
    })

    expect(resolver).toHaveBeenCalledWith("identity-1", {
      env: validEnv,
    })
    expect(admin.roles).toEqual(["auth_admin", "security_operator"])
    expect(admin.roleCheckedAt).toBe(1_700_000_100_000)
    expect(session.save).toHaveBeenCalledOnce()
  })

  it("destroys the session when the role recheck fails", async () => {
    const session: SessionData & {
      destroy: Mock<() => void>
      save: Mock<() => Promise<void>>
    } = {
      admin: {
        subject: "identity-1",
        acr: "aal2",
        roles: ["auth_admin"],
        authenticatedAt: 1_700_000_000_000,
        roleCheckedAt: 1_700_000_000_000,
        csrfToken: "csrf-token",
      },
      destroy: vi.fn<() => void>(),
      save: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }

    await expect(
      requireAdmin(true, {
        env: validEnv,
        getSession: async () => session,
        resolveAdministrator: vi
          .fn()
          .mockRejectedValue(new Error("administrator role is missing")),
      }),
    ).rejects.toThrow(/role is missing/)
    expect(session.destroy).toHaveBeenCalledOnce()
  })
})
