import "server-only"

import type { UpdateIdentityBody } from "@ory/client"

import { hydra } from "@/lib/ory/hydra"
import {
  kratos,
  type KratosIdentity,
} from "@/lib/ory/kratos"

export const identityRoles = ["auth_admin", "security_operator"] as const
export type IdentityRole = (typeof identityRoles)[number]

export class IdentityOperationError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status = 409) {
    super(code)
    this.name = "IdentityOperationError"
    this.code = code
    this.status = status
  }
}

interface IdentityRegistry {
  getIdentity(id: string): Promise<KratosIdentity>
  listIdentities(page?: number, pageSize?: number): Promise<KratosIdentity[]>
  updateIdentity(
    id: string,
    body: UpdateIdentityBody,
  ): Promise<KratosIdentity>
  revokeAllSessions(id: string): Promise<{ count: number }>
  deleteIdentity(id: string): Promise<null>
}

interface ConsentRegistry {
  revokeAllConsentForSubject(subject: string): Promise<null>
}

interface IdentityOperationDependencies {
  kratos: IdentityRegistry
  hydra: ConsentRegistry
}

const metadata = (identity: KratosIdentity): Record<string, unknown> =>
  identity.metadata_admin &&
  typeof identity.metadata_admin === "object" &&
  !Array.isArray(identity.metadata_admin)
    ? { ...(identity.metadata_admin as Record<string, unknown>) }
    : {}

export const rolesForIdentity = (identity: KratosIdentity): string[] => {
  const roles = metadata(identity).roles
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : []
}

const updateBody = (
  identity: KratosIdentity,
  overrides: Partial<UpdateIdentityBody> = {},
): UpdateIdentityBody => {
  if (identity.state !== "active" && identity.state !== "inactive") {
    throw new IdentityOperationError("invalid_identity_state", 400)
  }
  return {
    schema_id: identity.schema_id,
    state: identity.state,
    traits: identity.traits,
    metadata_public: identity.metadata_public,
    metadata_admin: identity.metadata_admin,
    ...overrides,
  }
}

export const createIdentityOperations = ({
  kratos: identities,
  hydra: consents,
}: IdentityOperationDependencies) => {
  const activeAdministrators = async (): Promise<KratosIdentity[]> => {
    const all = await identities.listIdentities(1, 500)
    return all.filter(
      (identity) =>
        identity.state === "active" &&
        rolesForIdentity(identity).includes("auth_admin"),
    )
  }

  return {
    updateRoles: async (
      id: string,
      requestedRoles: string[],
    ): Promise<KratosIdentity> => {
      const roles = [...new Set(requestedRoles)]
      if (
        roles.length !== requestedRoles.length ||
        roles.some(
          (role): role is string =>
            !identityRoles.includes(role as IdentityRole),
        )
      ) {
        throw new IdentityOperationError("invalid_identity_role", 400)
      }

      const identity = await identities.getIdentity(id)
      const currentRoles = rolesForIdentity(identity)
      if (
        identity.state === "active" &&
        currentRoles.includes("auth_admin") &&
        !roles.includes("auth_admin") &&
        (await activeAdministrators()).length <= 1
      ) {
        throw new IdentityOperationError("last_active_auth_admin")
      }
      return identities.updateIdentity(
        id,
        updateBody(identity, {
          metadata_admin: { ...metadata(identity), roles },
        }),
      )
    },

    updateState: async (
      id: string,
      state: string,
    ): Promise<KratosIdentity> => {
      if (state !== "active" && state !== "inactive") {
        throw new IdentityOperationError("invalid_identity_state", 400)
      }
      const identity = await identities.getIdentity(id)
      if (
        state === "inactive" &&
        identity.state === "active" &&
        rolesForIdentity(identity).includes("auth_admin") &&
        (await activeAdministrators()).length <= 1
      ) {
        throw new IdentityOperationError("last_active_auth_admin")
      }
      return identities.updateIdentity(id, updateBody(identity, { state }))
    },

    delete: async (
      id: string,
      confirmation: string,
      actorSubject: string,
    ): Promise<null> => {
      if (confirmation !== id) {
        throw new IdentityOperationError("confirmation_mismatch", 400)
      }
      if (actorSubject === id) {
        throw new IdentityOperationError("administrator_cannot_delete_self")
      }
      const identity = await identities.getIdentity(id)
      if (
        identity.state === "active" &&
        rolesForIdentity(identity).includes("auth_admin") &&
        (await activeAdministrators()).length <= 1
      ) {
        throw new IdentityOperationError("last_active_auth_admin")
      }
      await Promise.all([
        identities.revokeAllSessions(id),
        consents.revokeAllConsentForSubject(id),
      ])
      return identities.deleteIdentity(id)
    },
  }
}

export const identityOperations = createIdentityOperations({ kratos, hydra })
