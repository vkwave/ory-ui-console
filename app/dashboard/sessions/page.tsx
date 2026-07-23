import Link from "next/link"

import { CircleAlertIcon, ShieldAlertIcon } from "lucide-react"

import { RevokeSessionButton } from "@/app/dashboard/users/[id]/identity-actions"
import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { requireAdmin } from "@/lib/auth/require-admin"
import { checkOryHealth, type OryHealth } from "@/lib/ory/health"
import { kratos, type KratosSession } from "@/lib/ory/kratos"
import { fmtDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const unavailable: OryHealth = {
  hydra: false,
  kratos: false,
  degraded: true,
  readOnly: true,
}

export default async function SessionsPage() {
  await requireAdmin(false)
  const [healthResult, sessionsResult] = await Promise.allSettled([
    checkOryHealth(),
    kratos.listSessions(1, 200),
  ])
  const health =
    healthResult.status === "fulfilled" ? healthResult.value : unavailable
  const sessions =
    sessionsResult.status === "fulfilled" ? sessionsResult.value : []
  const columns: Column<KratosSession>[] = [
    {
      key: "id",
      header: "Session ID",
      cell: (session) => (
        <span className="font-mono text-xs">{session.id.slice(0, 8)}…</span>
      ),
    },
    {
      key: "subject",
      header: "User",
      cell: (session) => (
        <Link
          href={`/dashboard/users/${session.identity.id}`}
          className="soft-link text-sm"
        >
          {String(
            (session.identity.traits as { email?: string }).email ??
              session.identity.id.slice(0, 8),
          )}
        </Link>
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
      key: "authenticated_at",
      header: "Authenticated",
      cell: (session) => fmtDate(session.authenticated_at),
    },
    {
      key: "expires_at",
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
        eyebrow="Kratos"
        title="Sessions"
        description="Review active and inactive identity sessions and revoke access when needed."
        className="mb-0"
      />
      {health.readOnly && (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Administrator APIs are degraded</AlertTitle>
          <AlertDescription>Session controls are read-only.</AlertDescription>
        </Alert>
      )}
      {sessionsResult.status === "rejected" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Sessions could not be loaded</AlertTitle>
          <AlertDescription>The Kratos administrator API is unavailable.</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(session) => session.id}
        emptyMessage="No sessions found."
      />
    </div>
  )
}
