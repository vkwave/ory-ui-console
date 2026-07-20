// @vitest-environment node

import { z } from "zod"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}))

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}))

import { GET as getSessionRoute } from "@/app/api/session/route"
import { audit } from "@/lib/security/audit"
import { safeErrorResponse } from "@/lib/security/errors"
import { safeSummary } from "@/lib/security/redact"
import { requireMutation } from "@/lib/security/request"

import { validEnv } from "./env"

const csrfToken = "c".repeat(43)
const admin = {
  subject: "identity-1",
  acr: "aal2",
  roles: ["auth_admin"],
  authenticatedAt: 1_700_000_000_000,
  roleCheckedAt: 1_700_000_000_000,
  csrfToken,
}
const schema = z.object({ name: z.string().min(1) })

const request = (
  overrides: {
    body?: string
    contentType?: string
    csrf?: string
    idempotencyKey?: string
    origin?: string
  } = {},
) =>
  new Request("https://auth-admin.example.test/api/resource", {
    method: "POST",
    headers: {
      "content-type": overrides.contentType ?? "application/json",
      "idempotency-key": overrides.idempotencyKey ?? "request_key_123456",
      origin: overrides.origin ?? "https://auth-admin.example.test",
      "x-csrf-token": overrides.csrf ?? csrfToken,
    },
    body: overrides.body ?? JSON.stringify({ name: "safe" }),
  })

describe("console mutation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue(admin)
  })

  it.each([
    ["missing origin", { origin: "" }],
    ["wrong origin", { origin: "https://evil.example.test" }],
    ["missing csrf", { csrf: "" }],
    ["wrong csrf", { csrf: "x".repeat(43) }],
    ["wrong content type", { contentType: "text/plain" }],
    ["short idempotency key", { idempotencyKey: "short" }],
  ])("rejects %s", async (_name, overrides) => {
    await expect(
      requireMutation(request(overrides), schema, { env: validEnv }),
    ).rejects.toBeInstanceOf(Response)
  })

  it("rejects a streamed body larger than 64 KiB", async () => {
    await expect(
      requireMutation(
        request({ body: JSON.stringify({ name: "x".repeat(65 * 1024) }) }),
        schema,
        { env: validEnv },
      ),
    ).rejects.toMatchObject({ status: 413 })
  })

  it("authorizes fresh roles and returns only validated JSON", async () => {
    const result = await requireMutation(request(), schema, { env: validEnv })

    expect(mocks.requireAdmin).toHaveBeenCalledWith(true)
    expect(result).toMatchObject({
      admin,
      idempotencyKey: "request_key_123456",
      body: { name: "safe" },
    })
  })
})

describe("security output boundaries", () => {
  it("redacts forbidden and non-scalar audit values twice", () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true)
    const summary = safeSummary(
      {
        client_id: "client-1",
        client_secret: "must-not-appear",
        email: "must-not-appear@example.test",
        nested: { credential: "must-not-appear" },
      },
      ["client_id", "client_secret", "email", "nested"],
    )

    expect(summary).toEqual({ client_id: "client-1" })
    audit({
      actorSubject: "identity-1",
      action: "client.update",
      targetType: "oauth_client",
      targetID: "client-1",
      requestID: "request-1",
      result: "success",
      before: summary,
      after: { client_id: "client-2" },
      idempotencyKey: "request_key_123456",
    })
    const event = JSON.parse(String(write.mock.calls[0][0]))
    expect(event.before).toEqual({ client_id: "client-1" })
    expect(JSON.stringify(event)).not.toMatch(
      /must-not-appear|client_secret|email|credential/,
    )
    write.mockRestore()
  })

  it("never exposes an unexpected error message", async () => {
    const response = safeErrorResponse(
      new Error("access_token=secret-value at internal.service"),
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "internal_error" })
  })

  it("returns only the minimal browser session DTO", async () => {
    mocks.requireAdmin.mockResolvedValue(admin)

    const response = await getSessionRoute()

    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({
      acr: "aal2",
      csrfToken,
      subject: "identity-1",
      roles: ["auth_admin"],
    })
  })
})
