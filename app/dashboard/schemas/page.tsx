import Link from "next/link"

import { CircleAlertIcon, EyeIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { requireAdmin } from "@/lib/auth/require-admin"
import { kratos, type KratosSchema } from "@/lib/ory/kratos"

export const dynamic = "force-dynamic"

export default async function SchemasPage() {
  await requireAdmin(false)
  const result = await kratos.listSchemas().then(
    (schemas) => ({ schemas, error: false }),
    () => ({ schemas: [] as KratosSchema[], error: true }),
  )
  const columns: Column<KratosSchema>[] = [
    { key: "id", header: "Schema ID", cell: (schema) => schema.id },
    {
      key: "view",
      header: "",
      cell: (schema) => (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link href={`/dashboard/schemas/${encodeURIComponent(schema.id)}`} />
          }
        >
          <EyeIcon data-icon="inline-start" />
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kratos"
        title="Identity schemas"
        description="Read-only schema definitions managed through deployment configuration."
        className="mb-0"
      />
      {result.error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Schemas could not be loaded</AlertTitle>
          <AlertDescription>The Kratos administrator API is unavailable.</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={result.schemas}
        keyExtractor={(schema) => schema.id}
        emptyMessage="No identity schemas found."
      />
    </div>
  )
}
