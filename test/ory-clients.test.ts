// @vitest-environment node

import { describe, expect, it, vi } from "vitest"

import { createOryClients } from "@/lib/ory/clients"
import { checkOryHealth } from "@/lib/ory/health"
import { createHydraService } from "@/lib/ory/hydra"
import { createKratosService } from "@/lib/ory/kratos"
import { normalizeOryError } from "@/lib/ory/result"

import { validEnv } from "./env"

const basePath = (client: unknown): string =>
  (client as { basePath: string }).basePath

describe("official ORY clients", () => {
  it("binds every SDK client to its fixed internal endpoint", () => {
    const clients = createOryClients(validEnv)

    expect(basePath(clients.hydraAdmin)).toBe("http://hydra-admin:4445")
    expect(basePath(clients.hydraJWK)).toBe("http://hydra-admin:4445")
    expect(basePath(clients.kratosIdentities)).toBe("http://kratos-admin:4434")
    expect(basePath(clients.kratosCourier)).toBe("http://kratos-admin:4434")
  })

  it("uses official SDK methods without requesting identity credentials", async () => {
    const listOAuth2Clients = vi.fn().mockResolvedValue({
      data: [{ client_id: "client-1", client_name: "Client" }],
    })
    const getIdentity = vi.fn().mockResolvedValue({
      data: {
        id: "identity-1",
        schema_id: "default",
        schema_url: "https://schemas.example.test/default",
        state: "active",
        traits: {},
      },
    })
    const hydra = createHydraService(() => ({
      hydraAdmin: { listOAuth2Clients } as never,
      hydraJWK: {} as never,
    }))
    const kratos = createKratosService(() => ({
      kratosCourier: {} as never,
      kratosIdentities: { getIdentity } as never,
    }))

    await expect(hydra.listClients(1, 50)).resolves.toMatchObject([
      { client_id: "client-1", client_name: "Client" },
    ])
    expect(listOAuth2Clients).toHaveBeenCalledWith({ pageSize: 50 })
    await expect(kratos.getIdentity("identity-1")).resolves.toMatchObject({
      id: "identity-1",
      traits: {},
    })
    expect(getIdentity).toHaveBeenCalledWith({ id: "identity-1" })
  })

  it("strips retrievable client credentials from list and detail reads", async () => {
    const secretClient = {
      client_id: "client-1",
      client_secret: "must-not-reach-a-read-page",
      registration_access_token: "must-not-reach-a-read-page-either",
    }
    const hydra = createHydraService(() => ({
      hydraAdmin: {
        listOAuth2Clients: vi.fn().mockResolvedValue({ data: [secretClient] }),
        getOAuth2Client: vi.fn().mockResolvedValue({ data: secretClient }),
      } as never,
      hydraJWK: {} as never,
    }))

    const listed = await hydra.listClients()
    const detailed = await hydra.getClient("client-1")

    expect(JSON.stringify([listed, detailed])).not.toMatch(
      /must-not-reach|client_secret|registration_access_token/,
    )
  })

  it("returns only curated consent fields without client secrets or context", async () => {
    const listOAuth2ConsentSessions = vi.fn().mockResolvedValue({
      data: [
        {
          consent_request_id: "consent-1",
          consent_request: {
            subject: "identity-1",
            client: {
              client_id: "client-1",
              client_name: "Client",
              client_secret: "must-not-leak",
            },
          },
          grant_scope: ["openid", "mcp:tools"],
          context: { email: "must-not-leak@example.test" },
          session: { access_token: { credential: "must-not-leak" } },
        },
      ],
    })
    const hydra = createHydraService(() => ({
      hydraAdmin: { listOAuth2ConsentSessions } as never,
      hydraJWK: {} as never,
    }))

    const sessions = await hydra.listConsentSessions("identity-1")

    expect(sessions).toEqual([
      {
        consent_request_id: "consent-1",
        consent_request: {
          subject: "identity-1",
          client: expect.objectContaining({
            client_id: "client-1",
            client_name: "Client",
          }),
        },
        grant_scope: ["openid", "mcp:tools"],
      },
    ])
    expect(JSON.stringify(sessions)).not.toMatch(
      /must-not-leak|client_secret|context|session|email|credential/,
    )
  })

  it("masks courier recipients and removes message contents", async () => {
    const listCourierMessages = vi.fn().mockResolvedValue({
      data: [
        {
          id: "message-1",
          status: "sent",
          type: "email",
          template_type: "verification_valid",
          recipient: "alice@example.test",
          created_at: "2026-07-19T00:00:00Z",
          updated_at: "2026-07-19T00:01:00Z",
          send_count: 1,
          body: "verification code must-not-leak",
          subject: "must-not-leak",
        },
      ],
    })
    const kratos = createKratosService(() => ({
      kratosIdentities: {} as never,
      kratosCourier: { listCourierMessages } as never,
    }))

    const messages = await kratos.listMessages()

    expect(messages).toEqual([
      {
        id: "message-1",
        status: "sent",
        type: "email",
        template_type: "verification_valid",
        recipient: "a***@example.test",
        created_at: "2026-07-19T00:00:00Z",
        updated_at: "2026-07-19T00:01:00Z",
        send_count: 1,
      },
    ])
    expect(JSON.stringify(messages)).not.toMatch(/must-not-leak|body|subject/)
  })

  it("normalizes SDK failures without exposing upstream bodies", () => {
    const error = normalizeOryError({
      isAxiosError: true,
      response: {
        status: 502,
        data: { access_token: "secret", error: "raw upstream details" },
      },
    })

    expect(error).toMatchObject({
      status: 502,
      code: "ory_unavailable",
      message: "ORY administrator API request failed",
    })
    expect(JSON.stringify(error)).not.toMatch(/secret|raw upstream details/)
  })

  it("preserves a direct HTTP status without exposing upstream details", () => {
    const error = normalizeOryError({
      status: 429,
      body: { access_token: "secret", error: "raw upstream details" },
    })

    expect(error).toMatchObject({
      status: 429,
      code: "ory_rate_limited",
      message: "ORY administrator API request failed",
    })
    expect(JSON.stringify(error)).not.toMatch(/secret|raw upstream details/)
  })

  it("checks each fixed health endpoint once and enters read-only mode", async () => {
    const requestSpy = vi.fn(async (input: string | URL | Request) =>
      String(input).includes("hydra-admin")
        ? new Response(null, { status: 503 })
        : new Response(null, { status: 200 }),
    )
    const fetchMock = requestSpy as unknown as typeof fetch

    const health = await checkOryHealth({ env: validEnv, fetch: fetchMock })

    expect(requestSpy).toHaveBeenCalledTimes(2)
    expect(requestSpy.mock.calls.map(([input]) => String(input)).sort()).toEqual([
      "http://hydra-admin:4445/health/ready",
      "http://kratos-admin:4434/health/ready",
    ])
    expect(health).toEqual({
      degraded: true,
      hydra: false,
      kratos: true,
      readOnly: true,
    })
  })
})
