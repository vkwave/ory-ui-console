"use client"

import { useState } from "react"

import {
  CircleAlertIcon,
  CopyIcon,
  KeyRoundIcon,
  PowerIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react"

import { mutateOAuthClient } from "@/app/dashboard/oauth-clients/mutation"
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

type ClientAction = "rotate" | "disable" | "enable" | "delete" | "promote"

const actionCopy: Record<
  ClientAction,
  { title: string; description: string; confirm: string }
> = {
  rotate: {
    title: "Rotate client secret",
    description:
      "All existing deployments using the current secret will stop authenticating. The replacement is shown once.",
    confirm: "Rotate secret",
  },
  disable: {
    title: "Disable OAuth client",
    description:
      "Redirects and grants are removed, issued access tokens are revoked, and the previous callback is verified as rejected.",
    confirm: "Disable client",
  },
  enable: {
    title: "Re-enable OAuth client",
    description:
      "Restore the validated non-secret redirect and grant snapshot saved when this client was disabled.",
    confirm: "Enable client",
  },
  delete: {
    title: "Delete OAuth client",
    description:
      "Issued access tokens are revoked before permanent deletion. This cannot be undone.",
    confirm: "Delete client",
  },
  promote: {
    title: "Promote adapter-managed client",
    description:
      "The adapter will compare the current generation and atomically release ownership before console editing is enabled.",
    confirm: "Promote client",
  },
}

interface ClientActionsProps {
  clientID: string
  managedGeneration?: string
  disabled: boolean
}

export function ClientActions({
  clientID,
  managedGeneration,
  disabled,
}: ClientActionsProps) {
  const [action, setAction] = useState<ClientAction | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null)

  const open = (next: ClientAction) => {
    setAction(next)
    setConfirmation("")
    setError(null)
  }

  const confirm = async () => {
    if (!action) return
    setPending(true)
    setError(null)
    try {
      const encodedID = encodeURIComponent(clientID)
      if (action === "rotate") {
        const result = await mutateOAuthClient<{ client_secret: string }>(
          `/api/hydra/clients/${encodedID}/rotate`,
          { method: "POST", body: {} },
        )
        setAction(null)
        setOneTimeSecret(result.client_secret)
        return
      }
      if (action === "promote") {
        await mutateOAuthClient(`/api/hydra/clients/${encodedID}/promote`, {
          method: "POST",
          body: {},
        })
      } else if (action === "disable" || action === "enable") {
        await mutateOAuthClient(`/api/hydra/clients/${encodedID}/disable`, {
          method: "POST",
          body: { disabled: action === "disable" },
        })
      } else {
        await mutateOAuthClient(`/api/hydra/clients/${encodedID}`, {
          method: "DELETE",
          body: { confirmation },
        })
      }
      window.location.assign(
        action === "delete"
          ? "/dashboard/oauth-clients"
          : `/dashboard/oauth-clients/${encodedID}`,
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {managedGeneration ? (
          <Button variant="outline" onClick={() => open("promote")}>
            <ShieldCheckIcon data-icon="inline-start" />
            Promote client
          </Button>
        ) : (
          <>
            {!disabled && (
              <Button variant="outline" onClick={() => open("rotate")}>
                <KeyRoundIcon data-icon="inline-start" />
                Rotate secret
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => open(disabled ? "enable" : "disable")}
            >
              <PowerIcon data-icon="inline-start" />
              {disabled ? "Enable client" : "Disable client"}
            </Button>
            <Button variant="destructive" onClick={() => open("delete")}>
              <Trash2Icon data-icon="inline-start" />
              Delete client
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(isOpen) => !isOpen && !pending && setAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? actionCopy[action].title : "Client action"}</DialogTitle>
            <DialogDescription>
              {action ? actionCopy[action].description : "Confirm this action."}
              {action === "promote" && managedGeneration
                ? ` Current generation: ${managedGeneration}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>Operation failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {action === "delete" && (
              <Field data-invalid={confirmation !== "" && confirmation !== clientID}>
                <FieldLabel htmlFor="delete-client-confirmation">
                  Type the full client ID to confirm
                </FieldLabel>
                <Input
                  id="delete-client-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  aria-invalid={confirmation !== "" && confirmation !== clientID}
                  autoComplete="off"
                />
                <FieldDescription>{clientID}</FieldDescription>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAction(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={action === "delete" ? "destructive" : "default"}
              onClick={confirm}
              disabled={
                pending ||
                !action ||
                (action === "delete" && confirmation !== clientID)
              }
            >
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Working…" : action ? actionCopy[action].confirm : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={oneTimeSecret !== null}
        onOpenChange={(isOpen) => !isOpen && setOneTimeSecret(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy the new client secret</DialogTitle>
            <DialogDescription>
              This secret is shown once. Store it in the client deployment now.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="one-time-client-secret">Client secret</FieldLabel>
            <Input
              id="one-time-client-secret"
              value={oneTimeSecret ?? ""}
              readOnly
              autoComplete="off"
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                oneTimeSecret && navigator.clipboard.writeText(oneTimeSecret)
              }
            >
              <CopyIcon data-icon="inline-start" />
              Copy secret
            </Button>
            <Button type="button" onClick={() => setOneTimeSecret(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
