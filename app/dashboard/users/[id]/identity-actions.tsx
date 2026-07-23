"use client"

import { useState } from "react"

import {
  CircleAlertIcon,
  PowerIcon,
  Trash2Icon,
} from "lucide-react"

import { mutateConsole } from "@/app/dashboard/oauth-clients/mutation"
import { useTranslate } from "@/components/locale-provider"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

interface IdentityActionsProps {
  identityID: string
  state: string
  readOnly: boolean
}

export function IdentityActions({
  identityID,
  state,
  readOnly,
}: IdentityActionsProps) {
  const [action, setAction] = useState<"state" | "delete" | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (readOnly) return null

  const targetState = state === "active" ? "inactive" : "active"
  const confirm = async () => {
    if (!action) return
    setPending(true)
    setError(null)
    try {
      if (action === "delete") {
        await mutateConsole(`/api/kratos/identities/${identityID}`, {
          method: "DELETE",
          body: { confirmation },
        })
        window.location.assign("/dashboard/users")
      } else {
        await mutateConsole(`/api/kratos/identities/${identityID}`, {
          method: "PATCH",
          body: { state: targetState },
        })
        window.location.reload()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setAction("state")}>
          <PowerIcon data-icon="inline-start" />
          {targetState === "active"
            ? "Activate identity"
            : "Deactivate identity"}
        </Button>
        <Button variant="destructive" onClick={() => setAction("delete")}>
          <Trash2Icon data-icon="inline-start" />
          Delete identity
        </Button>
      </div>
      <Dialog
        open={action !== null}
        onOpenChange={(open) => !open && !pending && setAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "delete"
                ? "Delete identity"
                : `${targetState === "active" ? "Activate" : "Deactivate"} identity`}
            </DialogTitle>
            <DialogDescription>
              {action === "delete"
                ? "All identity sessions and Hydra consents are revoked before permanent deletion."
                : "This state change is checked against the last active administrator safeguard."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Identity operation failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {action === "delete" && (
            <Field data-invalid={confirmation !== "" && confirmation !== identityID}>
              <FieldLabel htmlFor="identity-delete-confirmation">
                Type the full identity ID to confirm
              </FieldLabel>
              <Input
                id="identity-delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                aria-invalid={confirmation !== "" && confirmation !== identityID}
              />
              <FieldDescription>{identityID}</FieldDescription>
            </Field>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant={action === "delete" ? "destructive" : "default"}
              onClick={confirm}
              disabled={
                pending ||
                !action ||
                (action === "delete" && confirmation !== identityID)
              }
            >
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Working…" : action === "delete" ? "Delete identity" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RevokeSessionButton({
  sessionID,
  readOnly,
}: {
  sessionID: string
  readOnly: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const revoke = async () => {
    setPending(true)
    setError(null)
    try {
      await mutateConsole(`/api/kratos/sessions/${sessionID}`, {
        method: "DELETE",
        body: {},
      })
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="destructive"
        onClick={revoke}
        disabled={readOnly || pending}
      >
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? "Working…" : "Revoke"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

export function RevokeAllSessionsButton({
  identityID,
  readOnly,
}: {
  identityID: string
  readOnly: boolean
}) {
  const t = useTranslate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const revoke = async () => {
    setPending(true)
    setError(null)
    try {
      await mutateConsole(`/api/kratos/identities/${identityID}/sessions`, {
        method: "DELETE",
        body: {},
      })
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="destructive"
        size="sm"
        onClick={revoke}
        disabled={readOnly || pending}
      >
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? t("sessions.working") : t("sessions.revokeAll")}
      </Button>
      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <CircleAlertIcon />
          <AlertTitle>{t("sessions.revokeFailed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
