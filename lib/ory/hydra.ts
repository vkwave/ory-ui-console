import "server-only"

import type {
  JsonPatch,
  JsonWebKeySet,
  OAuth2Client,
  OAuth2ConsentSession,
} from "@ory/client"

import { getOryClients, type OryClients } from "@/lib/ory/clients"
import { callOry } from "@/lib/ory/result"

export type HydraClient = OAuth2Client & {
  client_id: string
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  scope: string
  token_endpoint_auth_method: string
  created_at: string
  updated_at: string
}

export type ConsentSession = OAuth2ConsentSession
export type JWKSet = JsonWebKeySet

const clientView = (
  client: OAuth2Client,
  includeOneTimeSecret = false,
): HydraClient => {
  const safe = { ...client }
  delete safe.registration_access_token
  if (!includeOneTimeSecret) delete safe.client_secret
  return {
    ...safe,
    client_id: client.client_id ?? "",
    client_name: client.client_name ?? "",
    redirect_uris: client.redirect_uris ?? [],
    grant_types: client.grant_types ?? [],
    scope: client.scope ?? "",
    token_endpoint_auth_method: client.token_endpoint_auth_method ?? "",
    created_at: client.created_at ?? "",
    updated_at: client.updated_at ?? "",
  }
}

export const createHydraService = (
  clients: () => Pick<OryClients, "hydraAdmin" | "hydraJWK">,
) => ({
  listClients: async (_page = 1, pageSize = 50): Promise<HydraClient[]> => {
    void _page
    const response = await callOry(() =>
      clients().hydraAdmin.listOAuth2Clients({ pageSize }),
    )
    return response.data.map((client) => clientView(client))
  },

  getClient: async (id: string): Promise<HydraClient> => {
    const response = await callOry(() =>
      clients().hydraAdmin.getOAuth2Client({ id }),
    )
    return clientView(response.data)
  },

  createClient: async (body: OAuth2Client): Promise<HydraClient> => {
    const response = await callOry(() =>
      clients().hydraAdmin.createOAuth2Client({ oAuth2Client: body }),
    )
    return clientView(response.data, true)
  },

  updateClient: async (
    id: string,
    body: OAuth2Client,
  ): Promise<HydraClient> => {
    const response = await callOry(() =>
      clients().hydraAdmin.setOAuth2Client({
        id,
        oAuth2Client: { ...body, client_id: id },
      }),
    )
    return clientView(response.data)
  },

  patchClient: async (
    id: string,
    jsonPatch: JsonPatch[],
  ): Promise<HydraClient> => {
    const response = await callOry(() =>
      clients().hydraAdmin.patchOAuth2Client({ id, jsonPatch }),
    )
    return clientView(response.data, true)
  },

  deleteClient: async (id: string): Promise<null> => {
    await callOry(() => clients().hydraAdmin.deleteOAuth2Client({ id }))
    return null
  },

  revokeClientTokens: async (clientId: string): Promise<null> => {
    await callOry(() => clients().hydraAdmin.deleteOAuth2Token({ clientId }))
    return null
  },

  listConsentSessions: async (subject: string): Promise<ConsentSession[]> => {
    const response = await callOry(() =>
      clients().hydraAdmin.listOAuth2ConsentSessions({ subject }),
    )
    return response.data
  },

  revokeConsentSessions: async (
    subject: string,
    client?: string,
  ): Promise<null> => {
    await callOry(() =>
      clients().hydraAdmin.revokeOAuth2ConsentSessions({
        subject,
        client,
        all: client === undefined,
      }),
    )
    return null
  },

  revokeAllConsentForSubject: async (subject: string): Promise<null> => {
    await callOry(() =>
      clients().hydraAdmin.revokeOAuth2ConsentSessions({
        subject,
        all: true,
      }),
    )
    return null
  },

  KNOWN_JWK_SETS: [
    "hydra.openid.id-token",
    "hydra.jwt.access-token",
  ] as string[],

  getJWKSet: async (set: string): Promise<JWKSet> => {
    const response = await callOry(() =>
      clients().hydraJWK.getJsonWebKeySet({ set }),
    )
    return response.data
  },

  deleteJWKSet: async (set: string): Promise<null> => {
    await callOry(() => clients().hydraJWK.deleteJsonWebKeySet({ set }))
    return null
  },
})

export const hydra = createHydraService(getOryClients)
