import {
  CircleAlertIcon,
  InfoIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { ClientActions } from "@/app/dashboard/oauth-clients/client-actions"
import { ClientForm } from "@/app/dashboard/oauth-clients/client-form"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  adapterLifecycle,
  disabledSnapshot,
} from "@/lib/hydra/lifecycle"
import { requireAdmin } from "@/lib/auth/require-admin"
import { checkOryHealth, type OryHealth } from "@/lib/ory/health"
import { hydra } from "@/lib/ory/hydra"
import { fmtDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const unavailable: OryHealth = {
  hydra: false,
  kratos: false,
  degraded: true,
  readOnly: true,
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin(false)
  const { id } = await params
  const clientID = decodeURIComponent(id)
  const [healthResult, clientResult] = await Promise.allSettled([
    checkOryHealth(),
    hydra.getClient(clientID),
  ])
  const health =
    healthResult.status === "fulfilled" ? healthResult.value : unavailable

  if (clientResult.status === "rejected") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Hydra client"
          title={<span className="break-all font-mono text-2xl">{clientID}</span>}
          className="mb-0"
        />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Client could not be loaded</AlertTitle>
          <AlertDescription>
            The client does not exist or Hydra is unavailable.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const client = clientResult.value
  const lifecycle = adapterLifecycle(client)
  const disabled = disabledSnapshot(client)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Hydra client"
        title={<span className="break-all font-mono text-2xl">{clientID}</span>}
        description="Review ownership, exact redirects, grants, scopes, and lifecycle controls."
        className="mb-0"
        actions={
          !health.readOnly && (
            <ClientActions
              clientID={clientID}
              managedGeneration={lifecycle?.generation}
              disabled={disabled !== null}
            />
          )
        }
      />

      {health.readOnly && (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Administrator APIs are degraded</AlertTitle>
          <AlertDescription>
            This client is read-only until both Hydra and Kratos are healthy.
          </AlertDescription>
        </Alert>
      )}
      {lifecycle && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Adapter-managed client</AlertTitle>
          <AlertDescription>
            Direct editing, rotation, disable, and deletion are blocked. Use
            generation-checked promotion to transfer ownership to the console.
          </AlertDescription>
        </Alert>
      )}
      {disabled && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Client disabled</AlertTitle>
          <AlertDescription>
            Redirects and grants were removed at {fmtDate(disabled.disabled_at)}.
            Re-enable restores only the validated non-secret snapshot.
          </AlertDescription>
        </Alert>
      )}

      {lifecycle && (
        <Card>
          <CardHeader>
            <CardTitle>Adapter lifecycle</CardTitle>
            <CardDescription>
              Read-only ownership metadata supplied by the MCP OAuth adapter.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <Badge variant="secondary">{lifecycle.source}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Generation</p>
              <p className="break-all font-mono text-sm">{lifecycle.generation}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lease until</p>
              <p className="text-sm">{fmtDate(lifecycle.lease_until)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
          <CardDescription>
            Curated non-secret fields returned by the Hydra administrator API.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p>{client.client_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Scope</p>
              <p>{client.scope || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Token authentication</p>
              <p>{client.token_endpoint_auth_method || "—"}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p>Grant types</p>
            <div className="flex flex-wrap gap-1.5">
              {client.grant_types.map((grant) => (
                <Badge key={grant} variant="secondary">
                  {grant}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p>Redirect URIs</p>
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {client.redirect_uris.map((redirectURI) => (
                <li key={redirectURI} className="break-all font-mono text-xs">
                  {redirectURI}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {!health.readOnly && !lifecycle && !disabled && (
        <ClientForm mode="edit" client={client} />
      )}
    </div>
  )
}
