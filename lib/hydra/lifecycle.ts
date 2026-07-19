import "server-only"

import type { OAuth2Client } from "@ory/client"
import { z } from "zod"

import { parseOAuthClientForm } from "@/lib/hydra/client-schema"

export interface AdapterLifecycle {
  managed_by: "mcp-oauth-adapter"
  source: "cimd" | "dcr"
  source_uri: string
  generation: string
  created_at: string
  last_seen_at: string
  lease_until: string
  expires_at: string
  tombstone?: {
    generation: string
    created_at: string
    retry_count: number
    next_retry_at: string
  }
}

const dateTime = z.iso.datetime({ offset: true })
const adapterLifecycleSchema = z.object({
  managed_by: z.literal("mcp-oauth-adapter"),
  source: z.enum(["cimd", "dcr"]),
  source_uri: z.url(),
  generation: z.string().min(1).max(256),
  created_at: dateTime,
  last_seen_at: dateTime,
  lease_until: dateTime,
  expires_at: dateTime,
  tombstone: z
    .object({
      generation: z.string().min(1).max(256),
      created_at: dateTime,
      retry_count: z.number().int().min(0),
      next_retry_at: dateTime,
    })
    .optional(),
})

const disabledSnapshotSchema = z.object({
  disabled_at: dateTime,
  redirect_uris: z.array(z.string()),
  grant_types: z.array(z.string()),
  response_types: z.array(z.string()),
})

type DisabledSnapshot = z.infer<typeof disabledSnapshotSchema>

export class ClientLifecycleError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status = 409) {
    super(code)
    this.name = "ClientLifecycleError"
    this.code = code
    this.status = status
  }
}

const metadataRecord = (client: OAuth2Client): Record<string, unknown> =>
  client.metadata &&
  typeof client.metadata === "object" &&
  !Array.isArray(client.metadata)
    ? { ...(client.metadata as Record<string, unknown>) }
    : {}

export const adapterLifecycle = (
  client: OAuth2Client,
): AdapterLifecycle | null => {
  const lifecycle = metadataRecord(client).vkwave_mcp
  const parsed = adapterLifecycleSchema.safeParse(lifecycle)
  return parsed.success ? parsed.data : null
}

export const disabledSnapshot = (
  client: OAuth2Client,
): DisabledSnapshot | null => {
  const parsed = disabledSnapshotSchema.safeParse(
    metadataRecord(client).vkwave_console_disabled,
  )
  return parsed.success ? parsed.data : null
}

export const assertConsoleMutable = (client: OAuth2Client): void => {
  if (adapterLifecycle(client)) {
    throw new ClientLifecycleError("managed_client_requires_promotion")
  }
}

const withoutSecretMaterial = (client: OAuth2Client): OAuth2Client => {
  const safe = { ...client }
  delete safe.client_secret
  delete safe.registration_access_token
  return safe
}

export const disableClientDocument = (
  client: OAuth2Client,
  disabledAt = new Date().toISOString(),
): OAuth2Client => {
  assertConsoleMutable(client)
  const metadata = metadataRecord(client)
  if (metadata.vkwave_console_disabled !== undefined) {
    throw new ClientLifecycleError("client_already_disabled")
  }

  const snapshot = disabledSnapshotSchema.parse({
    disabled_at: disabledAt,
    redirect_uris: client.redirect_uris ?? [],
    grant_types: client.grant_types ?? [],
    response_types: client.response_types ?? [],
  })
  return {
    ...withoutSecretMaterial(client),
    redirect_uris: [],
    grant_types: [],
    response_types: [],
    metadata: { ...metadata, vkwave_console_disabled: snapshot },
  }
}

export const enableClientDocument = (client: OAuth2Client): OAuth2Client => {
  assertConsoleMutable(client)
  const metadata = metadataRecord(client)
  const snapshot = disabledSnapshotSchema.safeParse(
    metadata.vkwave_console_disabled,
  )
  if (!snapshot.success) {
    throw new ClientLifecycleError("client_is_not_disabled")
  }
  delete metadata.vkwave_console_disabled

  const candidate = {
    ...withoutSecretMaterial(client),
    redirect_uris: snapshot.data.redirect_uris,
    grant_types: snapshot.data.grant_types,
    response_types: snapshot.data.response_types,
    metadata,
  }
  const validated = parseOAuthClientForm({
    client_id: candidate.client_id,
    client_name: candidate.client_name,
    redirect_uris: candidate.redirect_uris,
    grant_types: candidate.grant_types,
    response_types: candidate.response_types,
    scope: candidate.scope,
    token_endpoint_auth_method: candidate.token_endpoint_auth_method,
    audience: candidate.audience ?? [],
  })
  return { ...candidate, ...validated }
}
