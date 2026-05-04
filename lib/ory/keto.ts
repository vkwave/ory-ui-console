const READ_BASE = process.env.KETO_READ_URL ?? "http://localhost:4466";
const WRITE_BASE = process.env.KETO_WRITE_URL ?? "http://localhost:4467";

async function ketoFetch(base: string, path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Keto ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface RelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject_id?: string;
  subject_set?: { namespace: string; object: string; relation: string };
}

export interface PermissionCheckResult {
  allowed: boolean;
}

export const keto = {
  listRelations: (
    namespace: string,
    relation?: string,
    subjectId?: string,
    pageToken?: string
  ): Promise<{ relation_tuples: RelationTuple[]; next_page_token: string }> => {
    const params = new URLSearchParams({ namespace });
    if (relation) params.set("relation", relation);
    if (subjectId) params.set("subject_id", subjectId);
    if (pageToken) params.set("page_token", pageToken);
    return ketoFetch(READ_BASE, `/relation-tuples?${params}`);
  },

  createRelation: (tuple: RelationTuple): Promise<null> =>
    ketoFetch(WRITE_BASE, "/relation-tuples", {
      method: "PUT",
      body: JSON.stringify(tuple),
    }),

  deleteRelation: (tuple: RelationTuple): Promise<null> => {
    const params = new URLSearchParams({
      namespace: tuple.namespace,
      object: tuple.object,
      relation: tuple.relation,
    });
    if (tuple.subject_id) params.set("subject_id", tuple.subject_id);
    return ketoFetch(WRITE_BASE, `/relation-tuples?${params}`, { method: "DELETE" });
  },

  checkPermission: (
    namespace: string,
    object: string,
    relation: string,
    subjectId: string
  ): Promise<PermissionCheckResult> => {
    const params = new URLSearchParams({ namespace, object, relation, subject_id: subjectId });
    return ketoFetch(READ_BASE, `/relation-tuples/check?${params}`);
  },

  expandPermissions: (
    namespace: string,
    object: string,
    relation: string,
    maxDepth = 5
  ): Promise<unknown> => {
    const params = new URLSearchParams({
      namespace,
      object,
      relation,
      max_depth: String(maxDepth),
    });
    return ketoFetch(READ_BASE, `/relation-tuples/expand?${params}`);
  },
};
