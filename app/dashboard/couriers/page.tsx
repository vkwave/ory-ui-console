import { CircleAlertIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { kratos, type CourierMessage } from "@/lib/ory/kratos"
import { fmtDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function CouriersPage() {
  const result = await kratos.listMessages(1, 100).then(
    (messages) => ({ messages, error: null as string | null }),
    () => ({ messages: [] as CourierMessage[], error: "Courier messages are unavailable." }),
  )
  const statusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" =>
    status === "sent" ? "default" : status === "queued" ? "secondary" : "destructive"

  const columns: Column<CourierMessage>[] = [
    {
      key: "id",
      header: "ID",
      cell: (message) => (
        <span className="font-mono text-xs">{message.id.slice(0, 8)}…</span>
      ),
    },
    { key: "recipient", header: "Recipient", cell: (message) => message.recipient },
    {
      key: "template",
      header: "Template",
      cell: (message) => message.template_type,
    },
    {
      key: "status",
      header: "Status",
      cell: (message) => (
        <Badge variant={statusVariant(message.status)}>{message.status}</Badge>
      ),
    },
    { key: "sends", header: "Sends", cell: (message) => message.send_count },
    {
      key: "created",
      header: "Created",
      cell: (message) => fmtDate(message.created_at),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kratos"
        title="Courier messages"
        description="Read-only delivery metadata. Message contents and recipient details are never exposed."
        className="mb-0"
      />
      {result.error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Courier messages could not be loaded</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={result.messages}
        keyExtractor={(message) => message.id}
        emptyMessage="No courier messages found."
      />
    </div>
  )
}
