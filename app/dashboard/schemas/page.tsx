import { kratos, KratosSchema } from "@/lib/ory/kratos";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SchemasPage() {
  let schemas: KratosSchema[] = [];
  let error: string | null = null;
  try {
    schemas = await kratos.listSchemas();
  } catch (e) {
    error = String(e);
  }

  const columns: Column<KratosSchema>[] = [
    { key: "id", header: "Schema ID", cell: (s) => s.id },
    {
      key: "view",
      header: "",
      cell: (s) => (
        <Link href={`/dashboard/schemas/${encodeURIComponent(s.id)}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Kratos"
        title="Identity Schemas"
        description="Open schema definitions used to validate identity traits and profile data."
      />
      {error && <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <DataTable
        columns={columns}
        data={schemas}
        keyExtractor={(s) => s.id}
        emptyMessage="No schemas found."
      />
    </div>
  );
}
