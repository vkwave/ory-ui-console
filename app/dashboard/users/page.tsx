import { kratos, KratosIdentity } from "@/lib/ory/kratos";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { fmtDate } from "@/lib/utils";
import { DeleteIdentityButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let identities: KratosIdentity[] = [];
  let error: string | null = null;
  try {
    identities = await kratos.listIdentities(1, 200);
  } catch (e) {
    error = String(e);
  }

  const columns: Column<KratosIdentity>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => (
        <Link href={`/dashboard/users/${row.id}`} className="soft-link font-mono text-xs">
          {row.id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => String((row.traits as { email?: string }).email ?? "—"),
    },
    {
      key: "state",
      header: "State",
      cell: (row) => (
        <Badge variant={row.state === "active" ? "default" : "secondary"}>
          {row.state}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (row) => fmtDate(row.created_at),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <DeleteIdentityButton id={row.id} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Kratos"
        title="Users"
        description="Browse identities, inspect traits, and manage attached sessions."
      />
      {error && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <DataTable columns={columns} data={identities} emptyMessage="No identities found." />
    </div>
  );
}
