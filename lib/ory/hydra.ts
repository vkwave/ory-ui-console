const BASE = process.env.HYDRA_ADMIN_URL ?? "http://localhost:4445";

async function oryFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hydra ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface HydraClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  scope: string;
  token_endpoint_auth_method: string;
  created_at: string;
  updated_at: string;
}

export interface ConsentSession {
  consent_request: {
    client: HydraClient;
    subject: string;
    requested_scope: string[];
  };
  grant_scope: string[];
  expires_at: Record<string, string>;
}

export interface JWKSet {
  set: string;
  keys: Array<{
    kid: string;
    kty: string;
    use: string;
    alg: string;
  }>;
}

export const hydra = {
  listClients: (page = 1, pageSize = 50): Promise<HydraClient[]> =>
    oryFetch(`/admin/clients?page=${page}&page_size=${pageSize}`),

  getClient: (id: string): Promise<HydraClient> =>
    oryFetch(`/admin/clients/${id}`),

  createClient: (body: Partial<HydraClient>): Promise<HydraClient> =>
    oryFetch("/admin/clients", { method: "POST", body: JSON.stringify(body) }),

  updateClient: (id: string, body: Partial<HydraClient>): Promise<HydraClient> =>
    oryFetch(`/admin/clients/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  deleteClient: (id: string): Promise<null> =>
    oryFetch(`/admin/clients/${id}`, { method: "DELETE" }),

  listConsentSessions: (subject: string): Promise<ConsentSession[]> =>
    oryFetch(`/admin/oauth2/auth/sessions/consent?subject=${encodeURIComponent(subject)}`),

  revokeConsentSessions: (subject: string, client?: string): Promise<null> => {
    const q = client
      ? `?subject=${encodeURIComponent(subject)}&client=${encodeURIComponent(client)}`
      : `?subject=${encodeURIComponent(subject)}`;
    return oryFetch(`/admin/oauth2/auth/sessions/consent${q}`, { method: "DELETE" });
  },

  listJWKSets: (): Promise<string[]> =>
    oryFetch("/admin/keys"),

  getJWKSet: (set: string): Promise<JWKSet> =>
    oryFetch(`/admin/keys/${set}`),

  deleteJWKSet: (set: string): Promise<null> =>
    oryFetch(`/admin/keys/${set}`, { method: "DELETE" }),
};
