import { kratos, KratosSession } from "@/lib/ory/kratos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table";
import { fmtDate } from "@/lib/utils";
import { RevokeSessionButton } from "./revoke-session-button";
import { RevokeAllSessionsButton } from "./revoke-all-sessions-button";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [identity, sessions] = await Promise.all([
    kratos.getIdentity(id),
    kratos.getIdentitySessions(id),
  ]);

  const sessionCols: Column<KratosSession>[] = [
    {
      key: "id",
      header: "Session ID",
      cell: (s) => <span className="font-mono text-xs">{s.id.slice(0, 8)}…</span>,
    },
    {
      key: "active",
      header: "Active",
      cell: (s) => <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "yes" : "no"}</Badge>,
    },
    {
      key: "expires",
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User: <span className="font-mono">{id}</span></h1>

      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="font-medium">Schema: </span>{identity.schema_id}</div>
          <div><span className="font-medium">State: </span><Badge>{identity.state}</Badge></div>
          <div><span className="font-medium">Created: </span>{fmtDate(identity.created_at)}</div>
          <div>
            <span className="font-medium">Traits:</span>
            <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-auto">
              {JSON.stringify(identity.traits, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sessions ({sessions.length})</CardTitle>
            <RevokeAllSessionsButton identityId={id} />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={sessionCols} data={sessions} emptyMessage="No sessions." />
        </CardContent>
      </Card>
    </div>
  );
}
