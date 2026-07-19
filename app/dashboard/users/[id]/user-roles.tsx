"use client"

import { useState } from "react"

import { CircleAlertIcon, SaveIcon } from "lucide-react"

import { mutateConsole } from "@/app/dashboard/oauth-clients/mutation"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const roles = [
  {
    value: "auth_admin",
    label: "Authentication administrator",
    description: "Full administrator access to this console.",
  },
  {
    value: "security_operator",
    label: "Security operator",
    description: "Security operations role reserved for curated workflows.",
  },
] as const

interface UserRolesProps {
  identityID: string
  initialRoles: string[]
  readOnly: boolean
}

export function UserRoles({
  identityID,
  initialRoles,
  readOnly,
}: UserRolesProps) {
  const [selected, setSelected] = useState(() =>
    initialRoles.filter((role) => roles.some((item) => item.value === role)),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (role: string, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...new Set([...current, role])]
        : current.filter((item) => item !== role),
    )
  }

  const save = async () => {
    setPending(true)
    setError(null)
    try {
      await mutateConsole(
        `/api/kratos/identities/${encodeURIComponent(identityID)}/roles`,
        { method: "PUT", body: { roles: selected } },
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrator roles</CardTitle>
        <CardDescription>
          Roles are stored in Kratos metadata_admin. Unrelated metadata is
          preserved on every update.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Role update failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FieldGroup data-slot="checkbox-group">
          {roles.map((role) => (
            <Field
              key={role.value}
              orientation="horizontal"
              data-disabled={readOnly || undefined}
            >
              <Checkbox
                id={`identity-role-${role.value}`}
                checked={selected.includes(role.value)}
                nativeButton
                aria-label={role.label}
                onCheckedChange={(checked) =>
                  !readOnly && toggle(role.value, checked)
                }
                disabled={readOnly}
                aria-disabled={readOnly}
                tabIndex={readOnly ? -1 : undefined}
              />
              <FieldContent>
                <FieldLabel htmlFor={`identity-role-${role.value}`}>
                  {role.label}
                </FieldLabel>
                <FieldDescription>{role.description}</FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={save} disabled={readOnly || pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          {pending ? "Saving…" : "Save roles"}
        </Button>
      </CardFooter>
    </Card>
  )
}
