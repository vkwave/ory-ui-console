import "server-only"

import type {
  Identity,
  IdentitySchemaContainer,
  JsonPatch,
  Message,
  Session,
  UpdateIdentityBody,
} from "@ory/client"

import { getOryClients, type OryClients } from "@/lib/ory/clients"
import { callOry, OryAdminError } from "@/lib/ory/result"
import { maskCourierRecipient } from "@/lib/kratos/recipient"

export type KratosIdentity = Omit<Identity, "credentials"> & {
  state: string
  created_at: string
  updated_at: string
  traits: Record<string, unknown>
}

export type KratosSession = Omit<Session, "identity"> & {
  active: boolean
  expires_at: string
  authenticated_at: string
  identity: KratosIdentity
}

export type KratosSchema = IdentitySchemaContainer
export type CourierMessage = Pick<
  Message,
  | "id"
  | "status"
  | "type"
  | "template_type"
  | "recipient"
  | "created_at"
  | "updated_at"
  | "send_count"
>

const identityView = (identity: Identity): KratosIdentity => {
  const { credentials: _credentials, ...safeIdentity } = identity
  void _credentials
  return {
    ...safeIdentity,
    state: identity.state ?? "inactive",
    traits:
      identity.traits && typeof identity.traits === "object"
        ? identity.traits
        : {},
    created_at: identity.created_at ?? "",
    updated_at: identity.updated_at ?? "",
  }
}

const sessionView = (
  session: Session,
  fallbackIdentity?: KratosIdentity,
): KratosSession => {
  const identity = session.identity
    ? identityView(session.identity)
    : fallbackIdentity
  if (!identity) {
    throw new OryAdminError(
      502,
      "ory_invalid_response",
      "ORY administrator API returned an invalid response",
    )
  }
  return {
    ...session,
    active: session.active ?? false,
    expires_at: session.expires_at ?? "",
    authenticated_at: session.authenticated_at ?? "",
    identity,
  }
}

const courierMessageView = (message: Message): CourierMessage => ({
  id: message.id,
  status: message.status,
  type: message.type,
  template_type: message.template_type,
  recipient: maskCourierRecipient(message.recipient),
  created_at: message.created_at,
  updated_at: message.updated_at,
  send_count: message.send_count,
})

export const createKratosService = (
  clients: () => Pick<OryClients, "kratosIdentities" | "kratosCourier">,
) => ({
  listIdentities: async (
    _page = 1,
    pageSize = 50,
  ): Promise<KratosIdentity[]> => {
    void _page
    const response = await callOry(() =>
      clients().kratosIdentities.listIdentities({ pageSize }),
    )
    return response.data.map(identityView)
  },

  getIdentity: async (id: string): Promise<KratosIdentity> => {
    const response = await callOry(() =>
      clients().kratosIdentities.getIdentity({ id }),
    )
    return identityView(response.data)
  },

  deleteIdentity: async (id: string): Promise<null> => {
    await callOry(() => clients().kratosIdentities.deleteIdentity({ id }))
    return null
  },

  patchIdentity: async (
    id: string,
    jsonPatch: JsonPatch[],
  ): Promise<KratosIdentity> => {
    const response = await callOry(() =>
      clients().kratosIdentities.patchIdentity({ id, jsonPatch }),
    )
    return identityView(response.data)
  },

  updateIdentity: async (
    id: string,
    updateIdentityBody: UpdateIdentityBody,
  ): Promise<KratosIdentity> => {
    const response = await callOry(() =>
      clients().kratosIdentities.updateIdentity({ id, updateIdentityBody }),
    )
    return identityView(response.data)
  },

  listSessions: async (
    _page = 1,
    pageSize = 50,
  ): Promise<KratosSession[]> => {
    void _page
    const response = await callOry(() =>
      clients().kratosIdentities.listSessions({
        pageSize,
        expand: ["identity"],
      }),
    )
    return response.data.map((session) => sessionView(session))
  },

  getIdentitySessions: async (id: string): Promise<KratosSession[]> => {
    const response = await callOry(() =>
      clients().kratosIdentities.listIdentitySessions({ id }),
    )
    const fallbackIdentity: KratosIdentity = {
      id,
      schema_id: "",
      schema_url: "",
      state: "inactive",
      traits: {},
      created_at: "",
      updated_at: "",
    }
    return response.data.map((session) =>
      sessionView(session, fallbackIdentity),
    )
  },

  revokeSession: async (id: string): Promise<null> => {
    await callOry(() => clients().kratosIdentities.disableSession({ id }))
    return null
  },

  revokeAllSessions: async (id: string): Promise<{ count: number }> => {
    await callOry(() =>
      clients().kratosIdentities.deleteIdentitySessions({ id }),
    )
    return { count: 0 }
  },

  listSchemas: async (): Promise<KratosSchema[]> => {
    const response = await callOry(() =>
      clients().kratosIdentities.listIdentitySchemas(),
    )
    return response.data
  },

  getSchemaContent: async (id: string): Promise<Record<string, unknown>> => {
    const response = await callOry(() =>
      clients().kratosIdentities.getIdentitySchema({ id }),
    )
    return response.data as Record<string, unknown>
  },

  listMessages: async (
    _page = 1,
    pageSize = 50,
  ): Promise<CourierMessage[]> => {
    void _page
    const response = await callOry(() =>
      clients().kratosCourier.listCourierMessages({ pageSize }),
    )
    return response.data.map(courierMessageView)
  },

})

export const kratos = createKratosService(getOryClients)
