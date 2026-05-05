import { kratos, KratosSession } from "@/lib/ory/kratos";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { fmtDate } from "@/lib/utils";
import Link from "next/link";
import { RevokeSessionButton } from "@/app/dashboard/users/[id]/revoke-session-button";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  let sessions: KratosSession[] = [];
  let error: string | null = null;
  try {
    sessions = await kratos.listSessions(1, 200);
  } catch (e) {
    error = String(e);
  }

  const columns: Column<KratosSession>[] = [
    {
      key: "id",
      header: "Session ID",
      cell: (s) => <span className="font-mono text-xs">{s.id.slice(0, 8)}…</span>,
    },
    {
      key: "subject",
      header: "User",
      cell: (s) => (
        <Link href={`/dashboard/users/${s.identity.id}`} className="soft-link text-sm">
          {String((s.identity.traits as { email?: string }).email ?? s.identity.id.slice(0, 8))}
        </Link>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (s) => <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "yes" : "no"}</Badge>,
    },
    {
      key: "authenticated_at",
      header: "Authenticated",
      cell: (s) => fmtDate(s.authenticated_at),
    },
    {
      key: "expires_at",
      header: "Expires",
      cell: (s) => fmtDate(s.expires_at),
    },
    {
      key: "revoke",
      header: "",
      cell: (s) => <RevokeSessionButton sessionId={s.id} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Kratos"
        title="Sessions"
        description="Review active and inactive identity sessions and revoke access when needed."
      />
      {error && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(s) => s.id}
        emptyMessage="No active sessions."
      />
    </div>
  );
}
