const BASE = process.env.KRATOS_ADMIN_URL ?? "http://localhost:4434";

async function oryFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kratos ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface KratosIdentity {
  id: string;
  schema_id: string;
  state: string;
  traits: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KratosSession {
  id: string;
  active: boolean;
  expires_at: string;
  authenticated_at: string;
  identity: KratosIdentity;
}

export interface KratosSchema {
  id: string;
  url: string;
}

export interface CourierMessage {
  id: string;
  status: string;
  type: string;
  template_type: string;
  recipient: string;
  created_at: string;
  send_count: number;
}

export const kratos = {
  listIdentities: (page = 1, perPage = 50): Promise<KratosIdentity[]> =>
    oryFetch(`/admin/identities?page=${page}&per_page=${perPage}`),

  getIdentity: (id: string): Promise<KratosIdentity> =>
    oryFetch(`/admin/identities/${id}?include_credential=oidc`),

  deleteIdentity: (id: string): Promise<null> =>
    oryFetch(`/admin/identities/${id}`, { method: "DELETE" }),

  patchIdentity: (id: string, patch: unknown): Promise<KratosIdentity> =>
    oryFetch(`/admin/identities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listSessions: (page = 1, perPage = 50): Promise<KratosSession[]> =>
    oryFetch(`/admin/sessions?page=${page}&per_page=${perPage}&expand=Identity`),

  getIdentitySessions: (id: string): Promise<KratosSession[]> =>
    oryFetch(`/admin/identities/${id}/sessions`),

  revokeSession: (sessionId: string): Promise<null> =>
    oryFetch(`/admin/sessions/${sessionId}`, { method: "DELETE" }),

  revokeAllSessions: (identityId: string): Promise<{ count: number }> =>
    oryFetch(`/admin/identities/${identityId}/sessions`, { method: "DELETE" }),

  listSchemas: (): Promise<KratosSchema[]> =>
    oryFetch("/schemas"),

  listMessages: (page = 1, perPage = 50): Promise<CourierMessage[]> =>
    oryFetch(`/admin/courier/messages?page=${page}&per_page=${perPage}`),

  retryMessage: (msgId: string): Promise<CourierMessage> =>
    oryFetch(`/admin/courier/messages/${msgId}/deliver`, { method: "PATCH" }),
};
