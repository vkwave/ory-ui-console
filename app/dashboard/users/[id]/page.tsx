import { CircleAlertIcon, ShieldAlertIcon } from "lucide-react"

import {
  IdentityActions,
  RevokeAllSessionsButton,
  RevokeSessionButton,
} from "@/app/dashboard/users/[id]/identity-actions"
import { UserRoles } from "@/app/dashboard/users/[id]/user-roles"
import { DataTable, type Column } from "@/components/data-table"
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
import { requireAdmin } from "@/lib/auth/require-admin"
import { rolesForIdentity } from "@/lib/kratos/identity-operations"
import { checkOryHealth, type OryHealth } from "@/lib/ory/health"
import {
  kratos,
  type KratosIdentity,
  type KratosSession,
} from "@/lib/ory/kratos"
import { fmtDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const unavailable: OryHealth = {
  hydra: false,
  kratos: false,
  degraded: true,
  readOnly: true,
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin(false)
  const { id } = await params
  const [healthResult, identityResult, sessionsResult] =
    await Promise.allSettled([
      checkOryHealth(),
      kratos.getIdentity(id),
      kratos.getIdentitySessions(id),
    ])
  const health =
    healthResult.status === "fulfilled" ? healthResult.value : unavailable

  if (identityResult.status === "rejected") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Kratos identity"
          title={<span className="break-all font-mono text-2xl">{id}</span>}
          className="mb-0"
        />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Identity could not be loaded</AlertTitle>
          <AlertDescription>
            The identity does not exist or Kratos is unavailable.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const identity: KratosIdentity = identityResult.value
  const sessions: KratosSession[] =
    sessionsResult.status === "fulfilled" ? sessionsResult.value : []
  const sessionColumns: Column<KratosSession>[] = [
    {
      key: "id",
      header: "Session ID",
      cell: (session) => (
        <span className="font-mono text-xs">{session.id.slice(0, 8)}…</span>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (session) => (
        <Badge variant={session.active ? "default" : "secondary"}>
          {session.active ? "yes" : "no"}
        </Badge>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      cell: (session) => fmtDate(session.expires_at),
    },
    {
      key: "revoke",
      header: "",
      cell: (session) => (
        <RevokeSessionButton sessionID={session.id} readOnly={health.readOnly} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kratos identity"
        title={<span className="break-all font-mono text-2xl">{id}</span>}
        description="Inspect non-credential identity data and administer the closed role set and attached sessions."
        className="mb-0"
        actions={
          <IdentityActions
            identityID={id}
            state={identity.state}
            readOnly={health.readOnly}
          />
        }
      />
      {health.readOnly && (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Administrator APIs are degraded</AlertTitle>
          <AlertDescription>
            This identity is read-only until Hydra and Kratos health checks
            succeed.
          </AlertDescription>
        </Alert>
      )}
      {sessionsResult.status === "rejected" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sessions could not be loaded</AlertTitle>
          <AlertDescription>
            The identity is available, but Kratos session data is unavailable.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Credentials are intentionally excluded from this administrator view.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Schema</p>
              <p>{identity.schema_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">State</p>
              <Badge variant={identity.state === "active" ? "default" : "secondary"}>
                {identity.state}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{fmtDate(identity.created_at)}</p>
            </div>
          </div>
          <div>
            <p className="font-medium">Traits</p>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
              {JSON.stringify(identity.traits, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
      <UserRoles
        identityID={id}
        initialRoles={rolesForIdentity(identity)}
        readOnly={health.readOnly}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Sessions ({sessions.length})</CardTitle>
              <CardDescription>
                Disable individual sessions or revoke every session for this identity.
              </CardDescription>
            </div>
            <RevokeAllSessionsButton identityID={id} readOnly={health.readOnly} />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={sessionColumns} data={sessions} emptyMessage="No sessions." />
        </CardContent>
      </Card>
    </div>
  )
}
