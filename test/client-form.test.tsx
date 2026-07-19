import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ClientForm,
  clientFormPayload,
} from "@/app/dashboard/oauth-clients/client-form"
import { ClientActions } from "@/app/dashboard/oauth-clients/client-actions"

describe("OAuth client form UI", () => {
  it("serializes exact redirects, grants, scopes, and audiences", () => {
    expect(
      clientFormPayload({
        clientID: "native-client",
        clientName: "Native Client",
        redirectURIs:
          "http://127.0.0.1:37123/callback\nhttp://[::1]:37123/callback\n",
        grantTypes: ["authorization_code", "refresh_token"],
        scope: "openid offline_access mcp:tools",
        tokenEndpointAuthMethod: "none",
        audience: "https://api.example.test\n",
      }),
    ).toEqual({
      client_id: "native-client",
      client_name: "Native Client",
      redirect_uris: [
        "http://127.0.0.1:37123/callback",
        "http://[::1]:37123/callback",
      ],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "openid offline_access mcp:tools",
      token_endpoint_auth_method: "none",
      audience: ["https://api.example.test"],
    })
  })

  it("renders accessible fields for the complete safe client shape", () => {
    render(<ClientForm mode="create" />)

    expect(screen.getByLabelText("Client ID")).toBeInTheDocument()
    expect(screen.getByLabelText("Client name")).toBeInTheDocument()
    expect(screen.getByLabelText("Redirect URIs")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Authorization code" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Refresh token" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Client credentials" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Scopes")).toBeInTheDocument()
    expect(screen.getByLabelText("Token endpoint authentication")).toBeInTheDocument()
    expect(screen.getByLabelText("Audiences")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Create client" }),
    ).toBeInTheDocument()
  })
})

describe("OAuth client action UI", () => {
  it("offers only explicit promotion for adapter-managed clients", () => {
    render(
      <ClientActions
        clientID="managed-client"
        managedGeneration="generation-1"
        disabled={false}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Promote client" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Rotate secret" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Delete client" }),
    ).not.toBeInTheDocument()
  })

  it("offers lifecycle controls for console-managed clients", () => {
    render(<ClientActions clientID="console-client" disabled={false} />)

    expect(
      screen.getByRole("button", { name: "Rotate secret" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Disable client" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Delete client" }),
    ).toBeInTheDocument()
  })
})
