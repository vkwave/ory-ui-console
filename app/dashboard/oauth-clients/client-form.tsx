"use client"

import { type FormEvent, useState } from "react"

import type { OAuth2Client } from "@ory/client"
import { CircleAlertIcon, PlusIcon, SaveIcon } from "lucide-react"
import Link from "next/link"

import { mutateOAuthClient } from "@/app/dashboard/oauth-clients/mutation"
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

type GrantType =
  | "authorization_code"
  | "refresh_token"
  | "client_credentials"
type TokenEndpointAuthMethod =
  | "client_secret_basic"
  | "client_secret_post"
  | "private_key_jwt"
  | "none"

export interface ClientFormValues {
  clientID: string
  clientName: string
  redirectURIs: string
  grantTypes: GrantType[]
  scope: string
  tokenEndpointAuthMethod: TokenEndpointAuthMethod
  audience: string
}

const lines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

export const clientFormPayload = (values: ClientFormValues) => ({
  client_id: values.clientID.trim(),
  client_name: values.clientName.trim(),
  redirect_uris: lines(values.redirectURIs),
  grant_types: values.grantTypes,
  response_types: values.grantTypes.includes("authorization_code")
    ? ["code"]
    : [],
  scope: values.scope.trim(),
  token_endpoint_auth_method: values.tokenEndpointAuthMethod,
  audience: lines(values.audience),
})

const initialValues = (client?: OAuth2Client): ClientFormValues => ({
  clientID: client?.client_id ?? "",
  clientName: client?.client_name ?? "",
  redirectURIs: (client?.redirect_uris ?? []).join("\n"),
  grantTypes: (client?.grant_types ?? [
    "authorization_code",
    "refresh_token",
  ]).filter((grant): grant is GrantType =>
    ["authorization_code", "refresh_token", "client_credentials"].includes(
      grant,
    ),
  ),
  scope: client?.scope ?? "openid offline_access mcp:tools",
  tokenEndpointAuthMethod:
    (client?.token_endpoint_auth_method as TokenEndpointAuthMethod) ??
    "client_secret_basic",
  audience: (client?.audience ?? []).join("\n"),
})

interface ClientFormProps {
  mode: "create" | "edit"
  client?: OAuth2Client
  onSaved?: (client: OAuth2Client) => void
}

export function ClientForm({ mode, client, onSaved }: ClientFormProps) {
  const [values, setValues] = useState(() => initialValues(client))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setGrant = (grant: GrantType, checked: boolean) => {
    setValues((current) => ({
      ...current,
      grantTypes: checked
        ? [...new Set([...current.grantTypes, grant])]
        : current.grantTypes.filter((item) => item !== grant),
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    const payload = clientFormPayload(values)
    try {
      const result = await mutateOAuthClient<OAuth2Client>(
        mode === "create"
          ? "/api/hydra/clients"
          : `/api/hydra/clients/${encodeURIComponent(values.clientID)}`,
        { method: mode === "create" ? "POST" : "PUT", body: payload },
      )
      if (onSaved) onSaved(result)
      else {
        window.location.assign(
          `/dashboard/oauth-clients/${encodeURIComponent(
            result.client_id ?? values.clientID,
          )}`,
        )
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "operation_failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Create OAuth client" : "Edit OAuth client"}
          </CardTitle>
          <CardDescription>
            Register only exact redirect URIs. Public clients must use
            Authorization Code with PKCE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>Client operation failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field data-disabled={mode === "edit" || undefined}>
              <FieldLabel htmlFor="oauth-client-id">Client ID</FieldLabel>
              <Input
                id="oauth-client-id"
                value={values.clientID}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    clientID: event.target.value,
                  }))
                }
                disabled={mode === "edit"}
                required
                autoComplete="off"
              />
              <FieldDescription>
                Stable identifier. It cannot be changed after creation.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="oauth-client-name">Client name</FieldLabel>
              <Input
                id="oauth-client-name"
                value={values.clientName}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    clientName: event.target.value,
                  }))
                }
                required
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="oauth-redirect-uris">
                Redirect URIs
              </FieldLabel>
              <Textarea
                id="oauth-redirect-uris"
                value={values.redirectURIs}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    redirectURIs: event.target.value,
                  }))
                }
                rows={4}
              />
              <FieldDescription>
                One exact URI per line. HTTPS is required except 127.0.0.1 or
                ::1 loopback callbacks with an explicit port.
              </FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend>Grant types</FieldLegend>
              <FieldDescription>
                Select only the flows this client actually needs.
              </FieldDescription>
              <FieldGroup data-slot="checkbox-group">
                {(
                  [
                    ["authorization_code", "Authorization code"],
                    ["refresh_token", "Refresh token"],
                    ["client_credentials", "Client credentials"],
                  ] as const
                ).map(([grant, label]) => (
                  <Field key={grant} orientation="horizontal">
                    <Checkbox
                      id={`oauth-grant-${grant}`}
                      checked={values.grantTypes.includes(grant)}
                      onCheckedChange={(checked) => setGrant(grant, checked)}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={`oauth-grant-${grant}`}>
                        {label}
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="oauth-client-scopes">Scopes</FieldLabel>
              <Input
                id="oauth-client-scopes"
                value={values.scope}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    scope: event.target.value,
                  }))
                }
                autoComplete="off"
              />
              <FieldDescription>Space-separated, without duplicates.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="oauth-token-auth-method">
                Token endpoint authentication
              </FieldLabel>
              <NativeSelect
                id="oauth-token-auth-method"
                className="w-full"
                value={values.tokenEndpointAuthMethod}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    tokenEndpointAuthMethod: event.target
                      .value as TokenEndpointAuthMethod,
                  }))
                }
              >
                <NativeSelectOption value="client_secret_basic">
                  Client secret basic
                </NativeSelectOption>
                <NativeSelectOption value="client_secret_post">
                  Client secret post
                </NativeSelectOption>
                <NativeSelectOption value="private_key_jwt">
                  Private key JWT
                </NativeSelectOption>
                <NativeSelectOption value="none">
                  None (public client)
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="oauth-client-audiences">Audiences</FieldLabel>
              <Textarea
                id="oauth-client-audiences"
                value={values.audience}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    audience: event.target.value,
                  }))
                }
                rows={3}
              />
              <FieldDescription>One exact audience URL per line.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/oauth-clients" />}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : mode === "create" ? (
              <PlusIcon data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create client"
                : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
