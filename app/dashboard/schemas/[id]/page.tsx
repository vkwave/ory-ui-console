import { CircleAlertIcon } from "lucide-react"

import { JsonViewer } from "@/components/json-viewer"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth/require-admin"
import { kratos } from "@/lib/ory/kratos"

export const dynamic = "force-dynamic"

export default async function SchemaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin(false)
  const { id } = await params
  const schemaID = decodeURIComponent(id)
  const result = await kratos.getSchemaContent(schemaID).then(
    (schema) => ({ schema, error: false }),
    () => ({ schema: null, error: true }),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kratos schema"
        title={<span className="break-all font-mono text-2xl">{schemaID}</span>}
        description="Read-only configuration-as-code identity schema."
        className="mb-0"
      />
      {result.error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Schema could not be loaded</AlertTitle>
          <AlertDescription>
            The schema does not exist or Kratos is unavailable.
          </AlertDescription>
        </Alert>
      )}
      {result.schema && (
        <Card>
          <CardHeader>
            <CardTitle>Schema definition</CardTitle>
            <CardDescription>
              Changes must be reviewed and deployed through stack configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JsonViewer data={result.schema} maxHeight="600px" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
