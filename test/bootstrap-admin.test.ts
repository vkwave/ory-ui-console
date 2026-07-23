// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

import {
  bootstrapAdministrator,
  createBootstrapIdentityClient,
} from "@/scripts/bootstrap-admin"

const activeIdentity = {
  id: "11111111-1111-4111-8111-111111111111",
  schema_id: "default",
  schema_url: "https://schemas.example.test/default",
  state: "active",
  traits: { email: "admin@example.test" },
  metadata_public: { locale: "en" },
  metadata_admin: { retained: "keep-me", roles: ["security_operator"] },
}

describe("administrator bootstrap", () => {
  it("requires an explicit identity UUID and adds one auth_admin", async () => {
    const getIdentity = vi.fn().mockResolvedValue({ data: activeIdentity })
    const updateIdentity = vi.fn().mockResolvedValue({ data: activeIdentity })
    const client = { getIdentity, updateIdentity }

    await expect(
      bootstrapAdministrator(activeIdentity.id, client as never),
    ).resolves.toBe("updated")
    expect(getIdentity).toHaveBeenCalledWith({ id: activeIdentity.id })
    expect(updateIdentity).toHaveBeenCalledWith({
      id: activeIdentity.id,
      updateIdentityBody: {
        schema_id: "default",
        state: "active",
        traits: activeIdentity.traits,
        metadata_public: activeIdentity.metadata_public,
        metadata_admin: {
          retained: "keep-me",
          roles: ["security_operator", "auth_admin"],
        },
      },
    })
    expect(JSON.stringify(updateIdentity.mock.calls[0])).not.toContain(
      "password",
    )
  })

  it("is idempotent and rejects inactive or invalid identities", async () => {
    const updateIdentity = vi.fn()
    const unchanged = {
      getIdentity: vi.fn().mockResolvedValue({
        data: { ...activeIdentity, metadata_admin: { roles: ["auth_admin"] } },
      }),
      updateIdentity,
    }
    await expect(
      bootstrapAdministrator(activeIdentity.id, unchanged as never),
    ).resolves.toBe("unchanged")
    expect(updateIdentity).not.toHaveBeenCalled()

    await expect(
      bootstrapAdministrator("not-a-uuid", unchanged as never),
    ).rejects.toThrow(/identity UUID/)
    await expect(
      bootstrapAdministrator(
        activeIdentity.id,
        {
          getIdentity: vi.fn().mockResolvedValue({
            data: { ...activeIdentity, state: "inactive" },
          }),
          updateIdentity,
        } as never,
      ),
    ).rejects.toThrow(/must be active/)
  })

  it("creates a bootstrap-only SDK client from KRATOS_ADMIN_URL", () => {
    const client = createBootstrapIdentityClient({
      KRATOS_ADMIN_URL: "http://kratos-admin:4434",
    })
    expect((client as unknown as { basePath: string }).basePath).toBe(
      "http://kratos-admin:4434",
    )
  })
})
