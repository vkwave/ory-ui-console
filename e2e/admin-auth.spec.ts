import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

const mockBaseURL = "http://127.0.0.1:4555"
const targetIdentityID = "22222222-2222-4222-8222-222222222222"
const targetSessionID = "session-target"

const resetMock = async (request: APIRequestContext): Promise<void> => {
  const response = await request.post(`${mockBaseURL}/__test__/reset`, {
    data: {},
  })
  expect(response.ok()).toBeTruthy()
}

const setMockIdentity = async (
  request: APIRequestContext,
  state: "active" | "inactive",
  roles: string[],
): Promise<void> => {
  const response = await request.post(`${mockBaseURL}/__test__/identity`, {
    data: { state, roles },
  })
  expect(response.ok()).toBeTruthy()
}

const signIn = async (page: Page): Promise<void> => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Continue with VKWAVE" }).click()
}

const mutationHeaders = async (
  page: Page,
  key: string,
): Promise<Record<string, string>> => {
  const session = await page.request.get("/api/session")
  expect(session.ok()).toBeTruthy()
  const { csrfToken } = await session.json()
  return {
    origin: "http://127.0.0.1:3100",
    "content-type": "application/json",
    "idempotency-key": `e2e_${key}_${Date.now()}`,
    "x-csrf-token": csrfToken,
  }
}

test.beforeEach(async ({ request }) => {
  await resetMock(request)
})

test("completes OIDC PKCE login with an AAL2 administrator", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByText("VKWAVE Authentication Console")).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)

  const authorization = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/oauth2/auth",
  )
  await page.getByRole("button", { name: "Continue with VKWAVE" }).click()
  const authorizationURL = new URL((await authorization).url())
  expect(authorizationURL.searchParams.get("code_challenge_method")).toBe("S256")
  expect(authorizationURL.searchParams.get("acr_values")).toBe("aal2")
  expect(authorizationURL.searchParams.get("nonce")).toBeTruthy()
  expect(authorizationURL.searchParams.get("state")).toBeTruthy()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("VKWAVE Auth Dashboard")).toBeVisible()
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "vkwave_admin_e2e",
  )
  expect(session).toMatchObject({
    domain: "127.0.0.1",
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
  })

  const csrfResponse = await page.request.get("/api/session")
  const { csrfToken } = await csrfResponse.json()
  expect(csrfToken).toBeTruthy()
  const rejected = await page.request.post("/api/hydra/clients", {
    headers: {
      origin: "http://127.0.0.1:3100",
      "content-type": "application/json",
      "idempotency-key": "e2e_request_key_123456",
      "x-csrf-token": `${csrfToken}-wrong`,
    },
    data: {},
  })
  expect(rejected.status()).toBe(403)
})

test("persists the source-owned Simplified Chinese navigation", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "vkwave_console_lang",
      value: "zh-CN",
      domain: "127.0.0.1",
      path: "/",
      sameSite: "Lax",
    },
  ])
  await page.goto("/login")
  await expect(page.getByText("VKWAVE 认证控制台")).toBeVisible()
})

test("fails closed for missing or inactive administrators and revokes an active session", async ({
  page,
  request,
}) => {
  await setMockIdentity(request, "active", [])
  await signIn(page)
  await expect(page).toHaveURL(/\/login\?error=oauth_callback$/)

  await resetMock(request)
  await setMockIdentity(request, "inactive", ["auth_admin"])
  await signIn(page)
  await expect(page).toHaveURL(/\/login\?error=oauth_callback$/)

  await resetMock(request)
  await signIn(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  await setMockIdentity(request, "active", [])
  const headers = await mutationHeaders(page, "role_removed")
  const rejected = await page.request.delete(
    `/api/kratos/identities/${targetIdentityID}/sessions`,
    { headers, data: {} },
  )
  expect(rejected.status()).toBe(500)
  expect((await page.request.get("/api/session")).status()).toBe(401)
})

test("promotes managed clients and completes the console client lifecycle", async ({
  page,
}) => {
  await signIn(page)
  await expect(page).toHaveURL(/\/dashboard$/)

  const promotionHeaders = await mutationHeaders(page, "promote")
  const promoted = await page.request.post(
    "/api/hydra/clients/managed-client/promote",
    { headers: promotionHeaders, data: {} },
  )
  expect(promoted.status()).toBe(200)
  expect((await promoted.json()).metadata?.vkwave_mcp).toBeUndefined()

  const client = {
    client_id: "e2e-console-client",
    client_name: "E2E Console Client",
    redirect_uris: ["http://127.0.0.1:37123/callback"],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    scope: "openid",
    token_endpoint_auth_method: "client_secret_basic",
    audience: ["https://auth.vkwave.com/mcp"],
  }
  const created = await page.request.post("/api/hydra/clients", {
    headers: await mutationHeaders(page, "create"),
    data: client,
  })
  expect(created.status()).toBe(201)

  const rotated = await page.request.post(
    `/api/hydra/clients/${client.client_id}/rotate`,
    { headers: await mutationHeaders(page, "rotate"), data: {} },
  )
  expect(rotated.status()).toBe(200)
  expect((await rotated.json()).client_secret).toBeTruthy()

  const disabled = await page.request.post(
    `/api/hydra/clients/${client.client_id}/disable`,
    {
      headers: await mutationHeaders(page, "disable"),
      data: { disabled: true },
    },
  )
  expect(disabled.status()).toBe(200)
  const enabled = await page.request.post(
    `/api/hydra/clients/${client.client_id}/disable`,
    {
      headers: await mutationHeaders(page, "enable"),
      data: { disabled: false },
    },
  )
  expect(enabled.status()).toBe(200)

  const deleted = await page.request.delete(
    `/api/hydra/clients/${client.client_id}`,
    {
      headers: await mutationHeaders(page, "delete"),
      data: { confirmation: client.client_id },
    },
  )
  expect(deleted.status()).toBe(200)
})

test("manages identity sessions and consent through the authenticated browser", async ({
  page,
}) => {
  await signIn(page)
  await expect(page).toHaveURL(/\/dashboard$/)

  const consents = await page.request.get(
    `/api/hydra/consents?subject=${targetIdentityID}`,
  )
  expect(consents.status()).toBe(200)
  expect((await consents.json())[0].grant_scope).toContain("mcp:tools")

  const revokedConsent = await page.request.delete("/api/hydra/consents", {
    headers: await mutationHeaders(page, "consent_revoke"),
    data: { subject: targetIdentityID, client: "managed-client" },
  })
  expect(revokedConsent.status()).toBe(200)

  const roles = await page.request.put(
    `/api/kratos/identities/${targetIdentityID}/roles`,
    {
      headers: await mutationHeaders(page, "roles"),
      data: { roles: ["security_operator"] },
    },
  )
  expect(roles.status()).toBe(200)

  const state = await page.request.patch(
    `/api/kratos/identities/${targetIdentityID}`,
    {
      headers: await mutationHeaders(page, "state"),
      data: { state: "inactive" },
    },
  )
  expect(state.status()).toBe(200)

  const revokedSession = await page.request.delete(
    `/api/kratos/sessions/${targetSessionID}`,
    { headers: await mutationHeaders(page, "session"), data: {} },
  )
  expect(revokedSession.status()).toBe(200)

  const revokedIdentitySessions = await page.request.delete(
    `/api/kratos/identities/${targetIdentityID}/sessions`,
    { headers: await mutationHeaders(page, "identity_sessions"), data: {} },
  )
  expect(revokedIdentitySessions.status()).toBe(200)

  const deletedIdentity = await page.request.delete(
    `/api/kratos/identities/${targetIdentityID}`,
    {
      headers: await mutationHeaders(page, "identity_delete"),
      data: { confirmation: targetIdentityID },
    },
  )
  expect(deletedIdentity.status()).toBe(200)
})
