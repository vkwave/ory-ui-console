import { hydra, HydraClient } from "@/lib/ory/hydra";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { fmtDate, truncate } from "@/lib/utils";
import { DeleteClientButton } from "./delete-client-button";

export const dynamic = "force-dynamic";

export default async function OAuthClientsPage() {
  let clients: HydraClient[] = [];
  let error: string | null = null;
  try {
    clients = await hydra.listClients(1, 200);
  } catch (e) {
    error = String(e);
  }

  const columns: Column<HydraClient>[] = [
    {
      key: "id",
      header: "Client ID",
      cell: (c) => (
        <Link href={`/dashboard/oauth-clients/${encodeURIComponent(c.client_id)}`} className="soft-link font-mono text-xs">
          {c.client_id}
        </Link>
      ),
    },
    { key: "name", header: "Name", cell: (c) => c.client_name || "—" },
    {
      key: "grant_types",
      header: "Grant Types",
      cell: (c) => (
        <div className="flex gap-1 flex-wrap">
          {(c.grant_types ?? []).map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
        </div>
      ),
    },
    { key: "scope", header: "Scope", cell: (c) => truncate(c.scope, 30) },
    { key: "created", header: "Created", cell: (c) => fmtDate(c.created_at) },
    {
      key: "delete",
      header: "",
      cell: (c) => <DeleteClientButton clientId={c.client_id} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Hydra"
        title="OAuth2 Clients"
        description="Inspect registered clients, scopes, grant types, and client metadata."
      />
      {error && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(c) => c.client_id}
        emptyMessage="No clients found."
      />
    </div>
  );
}
