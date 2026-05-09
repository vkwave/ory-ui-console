import { kratos, KratosSession } from "@/lib/ory/kratos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { fmtDate } from "@/lib/utils";
import { RevokeSessionButton } from "./revoke-session-button";
import { RevokeAllSessionsButton } from "./revoke-all-sessions-button";
import { UserRoles } from "./user-roles";

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
      <PageHeader
        eyebrow="Kratos Identity"
        title={<span className="break-all font-mono text-2xl">{id}</span>}
        description="Inspect identity metadata, traits, and associated sessions."
        className="mb-0"
      />

      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Schema</p>
              <p className="mt-1 font-medium">{identity.schema_id}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">State</p>
              <Badge className="mt-1">{identity.state}</Badge>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="mt-1 font-medium">{fmtDate(identity.created_at)}</p>
            </div>
          </div>
          <div>
            <span className="font-medium">Traits:</span>
            <pre className="mt-2 overflow-auto rounded-xl border border-border/50 bg-muted/35 p-3 text-xs">
              {JSON.stringify(identity.traits, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <UserRoles userId={id} />

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
