import "server-only"

import { loadConfig } from "@/lib/config"

export interface Administrator {
  subject: string
  roles: string[]
}

export const resolveAdministrator = async (
  subject: string,
  overrides?: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch },
): Promise<Administrator> => {
  const config = loadConfig(overrides?.env)
  const doFetch = overrides?.fetch ?? fetch
  const url = new URL(
    `/admin/identities/${encodeURIComponent(subject)}`,
    config.kratosAdminURL,
  )
  const response = await doFetch(url, {
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error("administrator identity lookup failed")
  }
  const identity = (await response.json()) as {
    id: string
    state?: string
    metadata_admin?: { roles?: unknown }
  }
  if (identity.id !== subject || identity.state !== "active") {
    throw new Error("administrator identity is inactive")
  }
  const roles = Array.isArray(identity.metadata_admin?.roles)
    ? identity.metadata_admin.roles.filter(
        (role): role is string => typeof role === "string",
      )
    : []
  if (!roles.includes(config.adminRole)) {
    throw new Error("administrator role is missing")
  }
  return { subject, roles }
}
