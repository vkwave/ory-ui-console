import { kratos, KratosSchema } from "@/lib/ory/kratos";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
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
      <h1 className="text-2xl font-bold mb-6">Identity Schemas</h1>
      {error && <p className="text-destructive mb-4">{error}</p>}
      <DataTable
        columns={columns}
        data={schemas}
        keyExtractor={(s) => s.id}
        emptyMessage="No schemas found."
      />
    </div>
  );
}
