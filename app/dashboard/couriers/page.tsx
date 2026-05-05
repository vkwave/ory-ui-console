import { kratos, CourierMessage } from "@/lib/ory/kratos";
import { DataTable, Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/utils";
import { RetryMessageButton } from "./retry-message-button";

export const dynamic = "force-dynamic";

export default async function CouriersPage() {
  let messages: CourierMessage[] = [];
  let error: string | null = null;
  try {
    messages = await kratos.listMessages(1, 100);
  } catch (e) {
    error = String(e);
  }

  const statusVariant = (s: string): "default" | "secondary" | "destructive" =>
    s === "sent" ? "default" : s === "queued" ? "secondary" : "destructive";

  const columns: Column<CourierMessage>[] = [
    { key: "id", header: "ID", cell: (m) => <span className="font-mono text-xs">{m.id.slice(0, 8)}…</span> },
    { key: "recipient", header: "Recipient", cell: (m) => m.recipient },
    { key: "template", header: "Template", cell: (m) => m.template_type },
    {
      key: "status",
      header: "Status",
      cell: (m) => <Badge variant={statusVariant(m.status)}>{m.status}</Badge>,
    },
    { key: "sends", header: "Sends", cell: (m) => m.send_count },
    { key: "created", header: "Created", cell: (m) => fmtDate(m.created_at) },
    {
      key: "retry",
      header: "",
      cell: (m) => <RetryMessageButton messageId={m.id} isSent={m.status === "sent"} />,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Courier Messages</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Read-only log of outgoing emails sent by Kratos (verification, recovery, OTP). Courier
        configuration (SMTP server, templates) is managed in the Kratos YAML config file — not via API.
      </p>
      {error && <p className="text-destructive mb-4">{error}</p>}
      <DataTable
        columns={columns}
        data={messages}
        keyExtractor={(m) => m.id}
        emptyMessage="No messages found."
      />
    </div>
  );
}
