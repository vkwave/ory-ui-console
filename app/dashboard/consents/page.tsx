"use client"

import { useState } from "react"

import { CircleAlertIcon, SearchIcon, Trash2Icon } from "lucide-react"

import { mutateConsole } from "@/app/dashboard/oauth-clients/mutation"
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ConsentSession } from "@/lib/ory/hydra"

export default function ConsentsPage() {
  const [subject, setSubject] = useState("")
  const [sessions, setSessions] = useState<ConsentSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const search = async () => {
    if (!subject) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/hydra/consents?subject=${encodeURIComponent(subject)}`,
        { cache: "no-store" },
      )
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          result && typeof result === "object" && "error" in result
            ? String(result.error)
            : "consent_search_failed",
        )
      }
      setSessions(result as ConsentSession[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "consent_search_failed")
    } finally {
      setPending(false)
    }
  }

  const revoke = async (client?: string) => {
    setPending(true)
    setError(null)
    try {
      await mutateConsole("/api/hydra/consents", {
        method: "DELETE",
        body: { subject, client },
      })
      await search()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "consent_revoke_failed")
      setPending(false)
    }
  }

  const columns: Column<ConsentSession>[] = [
    {
      key: "client",
      header: "Client",
      cell: (session) =>
        session.consent_request?.client?.client_name ||
        session.consent_request?.client?.client_id ||
        "—",
    },
    {
      key: "scopes",
      header: "Granted scopes",
      cell: (session) => (
        <div className="flex flex-wrap gap-1">
          {(session.grant_scope ?? []).map((scope) => (
            <Badge key={scope} variant="secondary">
              {scope}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "revoke",
      header: "",
      cell: (session) => {
        const clientID = session.consent_request?.client?.client_id

        return (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (clientID) void revoke(clientID)
            }}
            disabled={pending || !clientID}
          >
            <Trash2Icon data-icon="inline-start" />
            Revoke
          </Button>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Hydra"
        title="Consent sessions"
        description="Search grants by opaque subject ID and revoke one client or every grant."
        className="mb-0"
      />
      <Card>
        <CardHeader>
          <CardTitle>Find consent sessions</CardTitle>
          <CardDescription>
            Use the exact Kratos identity ID. No traits are searched or audited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="consent-subject">Subject ID</FieldLabel>
            <Input
              id="consent-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && search()}
              autoComplete="off"
            />
            <FieldDescription>Opaque Kratos identity identifier.</FieldDescription>
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {sessions.length > 0 && (
            <Button variant="destructive" onClick={() => revoke()} disabled={pending}>
              <Trash2Icon data-icon="inline-start" />
              Revoke all
            </Button>
          )}
          <Button onClick={search} disabled={pending || !subject}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SearchIcon data-icon="inline-start" />
            )}
            {pending ? "Searching…" : "Search"}
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Consent operation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sessions.length > 0 ? (
        <DataTable
          columns={columns}
          data={sessions}
          keyExtractor={(session, index) =>
            session.consent_request_id ??
            session.consent_request?.client?.client_id ??
            String(index)
          }
          emptyMessage="No consent sessions."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No consent sessions loaded</CardTitle>
            <CardDescription>
              Search for an opaque subject ID to inspect granted clients and scopes.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}
    </div>
  )
}
