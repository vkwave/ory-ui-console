// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

import { createAdapterClient } from "@/lib/adapter/client"
import { mutateOAuthClient } from "@/app/dashboard/oauth-clients/mutation"
import { AdapterClientError } from "@/lib/adapter/client"
import { createClientOperations } from "@/lib/hydra/client-operations"
import { parseOAuthClientForm } from "@/lib/hydra/client-schema"
import {
  adapterLifecycle,
  ClientLifecycleError,
  disableClientDocument,
  enableClientDocument,
} from "@/lib/hydra/lifecycle"
import { OryAdminError } from "@/lib/ory/result"
import { safeErrorResponse } from "@/lib/security/errors"

import { validEnv } from "./env"

const confidentialClient = {
  client_id: "console-client",
  client_name: "Console Client",
  redirect_uris: ["https://client.example.test/oauth/callback"],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  scope: "openid offline_access mcp:tools",
  token_endpoint_auth_method: "client_secret_basic",
  audience: ["https://api.example.test"],
}

describe("OAuth client form", () => {
  it("accepts confidential clients and exact native loopback public clients", () => {
    expect(parseOAuthClientForm(confidentialClient)).toMatchObject(
      confidentialClient,
    )
    expect(
      parseOAuthClientForm({
        ...confidentialClient,
        client_id: "native-client",
        redirect_uris: [
          "http://127.0.0.1:37123/callback",
          "http://[::1]:37123/callback",
        ],
        token_endpoint_auth_method: "none",
        audience: [],
      }),
    ).toMatchObject({
      client_id: "native-client",
      token_endpoint_auth_method: "none",
    })
  })

  it.each([
    "http://client.example.test/callback",
    "http://localhost:37123/callback",
    "http://127.0.0.1/callback",
    "https://10.0.0.8/callback",
    "https://172.16.0.8/callback",
    "https://192.168.1.8/callback",
    "https://169.254.1.8/callback",
    "https://user:password@client.example.test/callback",
    "https://client.example.test/callback#fragment",
    "https://*.example.test/callback",
  ])("rejects unsafe redirect URI %s", (redirectURI) => {
    expect(() =>
      parseOAuthClientForm({
        ...confidentialClient,
        redirect_uris: [redirectURI],
      }),
    ).toThrow(/redirect/i)
  })

  it("rejects duplicate redirects, scopes, and console-injected ownership", () => {
    expect(() =>
      parseOAuthClientForm({
        ...confidentialClient,
        redirect_uris: [
          confidentialClient.redirect_uris[0],
          confidentialClient.redirect_uris[0],
        ],
      }),
    ).toThrow(/duplicate redirect/i)
    expect(() =>
      parseOAuthClientForm({
        ...confidentialClient,
        scope: "openid mcp:tools openid",
      }),
    ).toThrow(/duplicate scope/i)
    expect(() =>
      parseOAuthClientForm({
        ...confidentialClient,
        metadata: {
          vkwave_mcp: { managed_by: "mcp-oauth-adapter" },
        },
      }),
    ).toThrow()
  })

  it("requires public clients to use the authorization code shape", () => {
    expect(() =>
      parseOAuthClientForm({
        ...confidentialClient,
        token_endpoint_auth_method: "none",
        grant_types: ["client_credentials"],
        response_types: [],
      }),
    ).toThrow(/public client/i)
  })
})

describe("OAuth client ownership and disable lifecycle", () => {
  const adapterManagedClient = {
    ...confidentialClient,
    metadata: {
      unrelated: "preserved",
      vkwave_mcp: {
        managed_by: "mcp-oauth-adapter",
        source: "cimd",
        source_uri: "https://client.example.test/cimd.json",
        generation: "generation-1",
        created_at: "2026-07-19T00:00:00Z",
        last_seen_at: "2026-07-19T00:01:00Z",
        lease_until: "2026-07-20T00:00:00Z",
        expires_at: "2026-08-19T00:00:00Z",
      },
    },
  }

  it("recognizes only complete generation-owned adapter metadata", () => {
    expect(adapterLifecycle(adapterManagedClient)).toMatchObject({
      managed_by: "mcp-oauth-adapter",
      generation: "generation-1",
      source: "cimd",
    })
    expect(
      adapterLifecycle({
        ...adapterManagedClient,
        metadata: {
          vkwave_mcp: {
            managed_by: "mcp-oauth-adapter",
            generation: "generation-1",
          },
        },
      }),
    ).toBeNull()
  })

  it("blocks console mutation while adapter ownership exists", () => {
    expect(() =>
      disableClientDocument(adapterManagedClient, "2026-07-19T01:00:00Z"),
    ).toThrow(/managed_client_requires_promotion/)
  })

  it("round-trips a non-secret disable snapshot and preserves other metadata", () => {
    const disabled = disableClientDocument(
      {
        ...confidentialClient,
        client_secret: "must-not-enter-snapshot",
        metadata: { unrelated: "preserved" },
      },
      "2026-07-19T01:00:00Z",
    )

    expect(disabled).toMatchObject({
      redirect_uris: [],
      grant_types: [],
      response_types: [],
      metadata: {
        unrelated: "preserved",
        vkwave_console_disabled: {
          disabled_at: "2026-07-19T01:00:00Z",
          redirect_uris: confidentialClient.redirect_uris,
          grant_types: confidentialClient.grant_types,
          response_types: confidentialClient.response_types,
        },
      },
    })
    expect(
      JSON.stringify(
        (disabled.metadata as Record<string, unknown>)
          .vkwave_console_disabled,
      ),
    ).not.toContain("must-not-enter-snapshot")

    const enabled = enableClientDocument(disabled)
    expect(enabled).toMatchObject({
      redirect_uris: confidentialClient.redirect_uris,
      grant_types: confidentialClient.grant_types,
      response_types: confidentialClient.response_types,
      metadata: { unrelated: "preserved" },
    })
    expect(enabled.metadata).not.toHaveProperty("vkwave_console_disabled")
  })
})

describe("adapter promotion client", () => {
  it("uses one fixed authenticated generation-checked request", async () => {
    const requestSpy = vi.fn().mockResolvedValue(
      Response.json({
        client_id: "managed/client",
        promoted: true,
      }),
    )
    const adapter = createAdapterClient({
      env: validEnv,
      fetch: requestSpy as unknown as typeof fetch,
    })

    await expect(
      adapter.promoteClient("managed/client", "generation-1"),
    ).resolves.toEqual({ client_id: "managed/client", promoted: true })

    expect(requestSpy).toHaveBeenCalledOnce()
    const [input, init] = requestSpy.mock.calls[0]
    expect(String(input)).toBe(
      "http://mcp-oauth-adapter:8081/internal/v1/clients/managed%2Fclient/promote",
    )
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Basic ${Buffer.from(
          "auth-admin-console:adapter-console-secret-32-characters",
        ).toString("base64")}`,
        "content-type": "application/json",
      },
    })
    expect(JSON.parse(String(init.body))).toEqual({
      expected_generation: "generation-1",
      reason: "operator promotion from administrator console",
    })
  })

  it("does not retry or expose an adapter failure body", async () => {
    const requestSpy = vi.fn().mockResolvedValue(
      Response.json(
        { access_token: "must-not-leak", error: "raw adapter detail" },
        { status: 409 },
      ),
    )
    const adapter = createAdapterClient({
      env: validEnv,
      fetch: requestSpy as unknown as typeof fetch,
    })

    const error = await adapter
      .promoteClient("managed-client", "stale-generation")
      .catch((caught: unknown) => caught)
    expect(requestSpy).toHaveBeenCalledOnce()
    expect(error).toMatchObject({
      code: "adapter_promotion_failed",
      status: 409,
    })
    expect(JSON.stringify(error)).not.toMatch(/must-not-leak|raw adapter detail/)
  })
})

describe("OAuth client operations", () => {
  const client = { ...confidentialClient, metadata: { unrelated: "kept" } }

  const dependencies = () => {
    const hydra = {
      createClient: vi.fn().mockImplementation(async (body) => body),
      getClient: vi.fn().mockResolvedValue(client),
      updateClient: vi.fn().mockImplementation(async (_id, body) => body),
      patchClient: vi.fn().mockImplementation(async (_id, patch) => ({
        ...client,
        client_secret: patch[0].value,
      })),
      revokeClientTokens: vi.fn().mockResolvedValue(null),
      deleteClient: vi.fn().mockResolvedValue(null),
    }
    const adapter = { promoteClient: vi.fn() }
    const verifyDisabled = vi.fn().mockResolvedValue(undefined)
    return { hydra, adapter, verifyDisabled }
  }

  it("rotates with one generated secret and returns it once", async () => {
    const deps = dependencies()
    const operations = createClientOperations({
      ...deps,
      randomSecret: () => "one-time-secret",
    })

    await expect(operations.rotate("console-client")).resolves.toMatchObject({
      client_id: "console-client",
      client_secret: "one-time-secret",
    })
    expect(deps.hydra.getClient).toHaveBeenCalledWith("console-client")
    expect(deps.hydra.patchClient).toHaveBeenCalledWith("console-client", [
      {
        op: "replace",
        path: "/client_secret",
        value: "one-time-secret",
      },
    ])
    expect(deps.hydra.patchClient).toHaveBeenCalledOnce()
  })

  it("disables, revokes tokens, verifies the old redirect, then re-enables", async () => {
    const deps = dependencies()
    const operations = createClientOperations({
      ...deps,
      now: () => new Date("2026-07-19T01:00:00Z"),
    })

    const disabled = await operations.setDisabled("console-client", true)
    expect(disabled.redirect_uris).toEqual([])
    expect(deps.hydra.updateClient).toHaveBeenCalledOnce()
    expect(deps.hydra.revokeClientTokens).toHaveBeenCalledWith("console-client")
    expect(deps.verifyDisabled).toHaveBeenCalledWith(
      "console-client",
      "https://client.example.test/oauth/callback",
    )

    deps.hydra.getClient.mockResolvedValueOnce(disabled)
    const enabled = await operations.setDisabled("console-client", false)
    expect(enabled.redirect_uris).toEqual(confidentialClient.redirect_uris)
    expect(deps.hydra.updateClient).toHaveBeenCalledTimes(2)
  })

  it("revokes tokens before confirmed deletion", async () => {
    const deps = dependencies()
    const operations = createClientOperations(deps)

    await expect(
      operations.delete("console-client", "wrong-client"),
    ).rejects.toThrow(/confirmation_mismatch/)
    expect(deps.hydra.revokeClientTokens).not.toHaveBeenCalled()

    await expect(
      operations.delete("console-client", "console-client"),
    ).resolves.toBeNull()
    expect(deps.hydra.revokeClientTokens.mock.invocationCallOrder[0]).toBeLessThan(
      deps.hydra.deleteClient.mock.invocationCallOrder[0],
    )
  })

  it("promotes exactly the generation read from Hydra and rechecks ownership", async () => {
    const deps = dependencies()
    const managed = {
      ...client,
      metadata: {
        vkwave_mcp: {
          managed_by: "mcp-oauth-adapter",
          source: "dcr",
          source_uri: "https://client.example.test/registration",
          generation: "generation-7",
          created_at: "2026-07-19T00:00:00Z",
          last_seen_at: "2026-07-19T00:01:00Z",
          lease_until: "2026-07-20T00:00:00Z",
          expires_at: "2026-08-19T00:00:00Z",
        },
      },
    }
    deps.hydra.getClient
      .mockResolvedValueOnce(managed)
      .mockResolvedValueOnce(client)
    deps.adapter.promoteClient.mockResolvedValue({
      client_id: "console-client",
      promoted: true,
    })
    const operations = createClientOperations(deps)

    await expect(operations.promote("console-client")).resolves.toEqual(client)
    expect(deps.adapter.promoteClient).toHaveBeenCalledWith(
      "console-client",
      "generation-7",
    )
    expect(deps.hydra.getClient).toHaveBeenCalledTimes(2)
  })

  it("rejects direct mutation of adapter-managed clients", async () => {
    const deps = dependencies()
    deps.hydra.getClient.mockResolvedValue({
      ...client,
      metadata: {
        vkwave_mcp: {
          managed_by: "mcp-oauth-adapter",
          source: "cimd",
          source_uri: "https://client.example.test/cimd.json",
          generation: "generation-1",
          created_at: "2026-07-19T00:00:00Z",
          last_seen_at: "2026-07-19T00:01:00Z",
          lease_until: "2026-07-20T00:00:00Z",
          expires_at: "2026-08-19T00:00:00Z",
        },
      },
    })
    const operations = createClientOperations({
      ...deps,
      randomSecret: () => "must-not-be-used",
    })

    await expect(operations.rotate("console-client")).rejects.toThrow(
      /managed_client_requires_promotion/,
    )
    await expect(
      operations.delete("console-client", "console-client"),
    ).rejects.toThrow(/managed_client_requires_promotion/)
    expect(deps.hydra.patchClient).not.toHaveBeenCalled()
    expect(deps.hydra.deleteClient).not.toHaveBeenCalled()
  })
})

describe("client lifecycle HTTP errors", () => {
  it.each([
    [
      new ClientLifecycleError("managed_client_requires_promotion", 409),
      409,
      "managed_client_requires_promotion",
    ],
    [new AdapterClientError(409), 409, "adapter_promotion_failed"],
    [new OryAdminError(502), 503, "ory_unavailable"],
  ])("returns only a stable safe code", async (error, status, code) => {
    const response = safeErrorResponse(error)

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: code })
  })
})

describe("browser OAuth client mutations", () => {
  it("fetches CSRF once and performs one non-retried mutation", async () => {
    const requestSpy = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          csrfToken: "csrf-token",
          subject: "identity-1",
          roles: ["auth_admin"],
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }))

    await expect(
      mutateOAuthClient(
        "/api/hydra/clients/client-1/disable",
        { method: "POST", body: { disabled: true } },
        {
          fetch: requestSpy as unknown as typeof fetch,
          origin: "https://auth-admin.example.test",
          idempotencyKey: () => "request_key_123456",
        },
      ),
    ).resolves.toEqual({ ok: true })

    expect(requestSpy).toHaveBeenCalledTimes(2)
    expect(requestSpy.mock.calls[0]).toEqual([
      "/api/session",
      { cache: "no-store" },
    ])
    expect(requestSpy.mock.calls[1][0]).toBe(
      "/api/hydra/clients/client-1/disable",
    )
    expect(requestSpy.mock.calls[1][1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "request_key_123456",
        origin: "https://auth-admin.example.test",
        "x-csrf-token": "csrf-token",
      },
      body: JSON.stringify({ disabled: true }),
    })
  })
})
