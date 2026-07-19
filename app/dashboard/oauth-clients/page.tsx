import Link from "next/link"

import { CircleAlertIcon, PlusIcon, ShieldAlertIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  adapterLifecycle,
  disabledSnapshot,
} from "@/lib/hydra/lifecycle"
import { checkOryHealth, type OryHealth } from "@/lib/ory/health"
import { hydra, type HydraClient } from "@/lib/ory/hydra"
import { fmtDate, truncate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const unavailable: OryHealth = {
  hydra: false,
  kratos: false,
  degraded: true,
  readOnly: true,
}

export default async function OAuthClientsPage() {
  const [healthResult, clientsResult] = await Promise.allSettled([
    checkOryHealth(),
    hydra.listClients(1, 200),
  ])
  const health =
    healthResult.status === "fulfilled" ? healthResult.value : unavailable
  const clients = clientsResult.status === "fulfilled" ? clientsResult.value : []
  const error =
    clientsResult.status === "rejected"
      ? "The Hydra administrator API is unavailable."
      : null

  const columns: Column<HydraClient>[] = [
    {
      key: "id",
      header: "Client ID",
      cell: (client) => (
        <Link
          href={`/dashboard/oauth-clients/${encodeURIComponent(client.client_id)}`}
          className="soft-link font-mono text-xs"
        >
          {client.client_id}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (client) => client.client_name || "—",
    },
    {
      key: "ownership",
      header: "Lifecycle",
      cell: (client) =>
        adapterLifecycle(client) ? (
          <Badge variant="secondary">Adapter managed</Badge>
        ) : disabledSnapshot(client) ? (
          <Badge variant="destructive">Disabled</Badge>
        ) : (
          <Badge variant="outline">Console managed</Badge>
        ),
    },
    {
      key: "grant_types",
      header: "Grant types",
      cell: (client) => (
        <div className="flex flex-wrap gap-1">
          {client.grant_types.map((grant) => (
            <Badge key={grant} variant="secondary">
              {grant}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      cell: (client) => truncate(client.scope, 30),
    },
    {
      key: "created",
      header: "Created",
      cell: (client) => fmtDate(client.created_at),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Hydra"
        title="OAuth clients"
        description="Create exact, standards-based OAuth clients and review adapter ownership before making changes."
        className="mb-0"
        actions={
          !health.readOnly && (
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/oauth-clients/new" />}
            >
              <PlusIcon data-icon="inline-start" />
              New client
            </Button>
          )
        }
      />
      {health.readOnly && (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Administrator APIs are degraded</AlertTitle>
          <AlertDescription>
            The console is read-only until both Hydra and Kratos health checks
            succeed. No mutation is retried automatically.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Clients could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(client) => client.client_id}
        emptyMessage="No OAuth clients found."
      />
    </div>
  )
}
