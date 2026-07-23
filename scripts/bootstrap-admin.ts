import type { IdentityApi, UpdateIdentityBody } from "@ory/client"

import { createBootstrapIdentityClient } from "../lib/ory/bootstrap-client.js"

export { createBootstrapIdentityClient } from "../lib/ory/bootstrap-client.js"

const identityUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const bootstrapAdministrator = async (
  identityID: string,
  kratosIdentities: Pick<IdentityApi, "getIdentity" | "updateIdentity"> =
    createBootstrapIdentityClient(),
): Promise<"updated" | "unchanged"> => {
  if (!identityUUID.test(identityID)) {
    throw new Error("a Kratos identity UUID is required")
  }
  const { data: identity } = await kratosIdentities.getIdentity({ id: identityID })
  if (identity.id !== identityID) throw new Error("identity ID mismatch")
  if (identity.state !== "active") throw new Error("identity must be active")
  const metadata =
    identity.metadata_admin &&
    typeof identity.metadata_admin === "object" &&
    !Array.isArray(identity.metadata_admin)
      ? { ...(identity.metadata_admin as Record<string, unknown>) }
      : {}
  const currentRoles = Array.isArray(metadata.roles)
    ? metadata.roles.filter((role): role is string => typeof role === "string")
    : []
  if (currentRoles.includes("auth_admin")) return "unchanged"

  const updateIdentityBody: UpdateIdentityBody = {
    schema_id: identity.schema_id,
    state: "active",
    traits: identity.traits,
    metadata_public: identity.metadata_public,
    metadata_admin: {
      ...metadata,
      roles: [...currentRoles, "auth_admin"],
    },
  }
  await kratosIdentities.updateIdentity({
    id: identityID,
    updateIdentityBody,
  })
  return "updated"
}

const main = async () => {
  const identityID = process.env.BOOTSTRAP_IDENTITY_ID
  if (!identityID) throw new Error("BOOTSTRAP_IDENTITY_ID is required")
  const result = await bootstrapAdministrator(identityID)
  process.stdout.write(`administrator bootstrap: ${result}\n`)
}

if (process.argv[1]?.endsWith("bootstrap-admin.js")) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "bootstrap failed"}\n`,
    )
    process.exitCode = 1
  })
}
