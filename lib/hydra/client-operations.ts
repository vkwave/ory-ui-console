import "server-only"

import { randomBytes } from "node:crypto"

import type { JsonPatch, OAuth2Client } from "@ory/client"

import { getAdapterClient } from "@/lib/adapter/client"
import { loadConfig } from "@/lib/config"
import { parseOAuthClientForm } from "@/lib/hydra/client-schema"
import {
  adapterLifecycle,
  assertConsoleMutable,
  ClientLifecycleError,
  disableClientDocument,
  enableClientDocument,
} from "@/lib/hydra/lifecycle"
import { hydra } from "@/lib/ory/hydra"

interface ClientRegistry {
  createClient(body: OAuth2Client): Promise<OAuth2Client>
  getClient(id: string): Promise<OAuth2Client>
  updateClient(id: string, body: OAuth2Client): Promise<OAuth2Client>
  patchClient(id: string, patch: JsonPatch[]): Promise<OAuth2Client>
  revokeClientTokens(clientID: string): Promise<null>
  deleteClient(id: string): Promise<null>
}

interface PromotionClient {
  promoteClient(
    clientID: string,
    expectedGeneration: string,
  ): Promise<unknown>
}

interface ClientOperationDependencies {
  hydra: ClientRegistry
  adapter: PromotionClient
  randomSecret?: () => string
  now?: () => Date
  verifyDisabled?: (
    clientID: string,
    previousRedirectURI: string | undefined,
  ) => Promise<void>
}

const verifyDisabledClient = async (
  clientID: string,
  previousRedirectURI: string | undefined,
): Promise<void> => {
  if (!previousRedirectURI) return

  const config = loadConfig()
  const authorization = new URL(config.authorizationEndpoint)
  authorization.search = new URLSearchParams({
    client_id: clientID,
    redirect_uri: previousRedirectURI,
    response_type: "code",
    scope: "openid",
    state: "disabled-client-verification",
    code_challenge: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    code_challenge_method: "S256",
  }).toString()
  let response: Response
  try {
    response = await fetch(authorization, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    throw new ClientLifecycleError("client_disable_verification_unavailable", 503)
  }
  if (response.status < 400) {
    throw new ClientLifecycleError("client_disable_verification_failed", 502)
  }
}

export const createClientOperations = ({
  hydra: registry,
  adapter,
  randomSecret = () => randomBytes(32).toString("base64url"),
  now = () => new Date(),
  verifyDisabled = verifyDisabledClient,
}: ClientOperationDependencies) => ({
  create: async (input: unknown): Promise<OAuth2Client> =>
    registry.createClient(parseOAuthClientForm(input)),

  update: async (id: string, input: unknown): Promise<OAuth2Client> => {
    const current = await registry.getClient(id)
    assertConsoleMutable(current)
    const update = parseOAuthClientForm(input)
    if (update.client_id !== id) {
      throw new ClientLifecycleError("client_id_mismatch", 400)
    }
    return registry.updateClient(id, {
      ...current,
      ...update,
      client_id: id,
      metadata: current.metadata,
    })
  },

  rotate: async (id: string): Promise<OAuth2Client> => {
    const current = await registry.getClient(id)
    assertConsoleMutable(current)
    return registry.patchClient(id, [
      {
        op: "replace",
        path: "/client_secret",
        value: randomSecret(),
      },
    ])
  },

  setDisabled: async (
    id: string,
    disabled: boolean,
  ): Promise<OAuth2Client> => {
    const current = await registry.getClient(id)
    assertConsoleMutable(current)
    if (!disabled) {
      return registry.updateClient(id, enableClientDocument(current))
    }

    const previousRedirectURI = current.redirect_uris?.[0]
    const updated = await registry.updateClient(
      id,
      disableClientDocument(current, now().toISOString()),
    )
    await registry.revokeClientTokens(id)
    await verifyDisabled(id, previousRedirectURI)
    return updated
  },

  delete: async (id: string, confirmation: string): Promise<null> => {
    if (confirmation !== id) {
      throw new ClientLifecycleError("confirmation_mismatch", 400)
    }
    const current = await registry.getClient(id)
    assertConsoleMutable(current)
    await registry.revokeClientTokens(id)
    return registry.deleteClient(id)
  },

  promote: async (id: string): Promise<OAuth2Client> => {
    const current = await registry.getClient(id)
    const lifecycle = adapterLifecycle(current)
    if (!lifecycle) {
      throw new ClientLifecycleError("client_is_not_adapter_managed", 409)
    }
    await adapter.promoteClient(id, lifecycle.generation)
    const promoted = await registry.getClient(id)
    if (adapterLifecycle(promoted)) {
      throw new ClientLifecycleError("adapter_promotion_incomplete", 502)
    }
    return promoted
  },
})

export const clientOperations = createClientOperations({
  hydra,
  adapter: {
    promoteClient: (clientID, expectedGeneration) =>
      getAdapterClient().promoteClient(clientID, expectedGeneration),
  },
})
