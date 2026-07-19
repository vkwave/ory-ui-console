import Link from "next/link"

import { CircleAlertIcon, ShieldAlertIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { checkOryHealth, type OryHealth } from "@/lib/ory/health"
import { kratos, type KratosIdentity } from "@/lib/ory/kratos"
import { fmtDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

const unavailable: OryHealth = {
  hydra: false,
  kratos: false,
  degraded: true,
  readOnly: true,
}

export default async function UsersPage() {
  const [healthResult, identitiesResult] = await Promise.allSettled([
    checkOryHealth(),
    kratos.listIdentities(1, 200),
  ])
  const health =
    healthResult.status === "fulfilled" ? healthResult.value : unavailable
  const identities =
    identitiesResult.status === "fulfilled" ? identitiesResult.value : []

  const columns: Column<KratosIdentity>[] = [
    {
      key: "id",
      header: "ID",
      cell: (identity) => (
        <Link
          href={`/dashboard/users/${identity.id}`}
          className="soft-link font-mono text-xs"
        >
          {identity.id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (identity) =>
        String((identity.traits as { email?: string }).email ?? "—"),
    },
    {
      key: "state",
      header: "State",
      cell: (identity) => (
        <Badge variant={identity.state === "active" ? "default" : "secondary"}>
          {identity.state}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (identity) => fmtDate(identity.created_at),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kratos"
        title="Users"
        description="Browse identities, inspect traits, administer the closed role set, and manage sessions."
        className="mb-0"
      />
      {health.readOnly && (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Administrator APIs are degraded</AlertTitle>
          <AlertDescription>
            Identity and role controls are read-only until Hydra and Kratos
            health checks succeed.
          </AlertDescription>
        </Alert>
      )}
      {identitiesResult.status === "rejected" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Identities could not be loaded</AlertTitle>
          <AlertDescription>The Kratos administrator API is unavailable.</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={identities}
        keyExtractor={(identity) => identity.id}
        emptyMessage="No identities found."
      />
    </div>
  )
}
