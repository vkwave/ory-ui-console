import { createServer } from "node:http"

import { exportJWK, generateKeyPair, SignJWT } from "jose"

const operatorIdentityID = "11111111-1111-4111-8111-111111111111"
const targetIdentityID = "22222222-2222-4222-8222-222222222222"
const fixedTime = "2026-07-19T00:00:00Z"

const json = (response, status, value, headers = {}) => {
  response.writeHead(status, {
    "content-type": "application/json",
    ...headers,
  })
  response.end(JSON.stringify(value))
}

const empty = (response, status = 204) => {
  response.writeHead(status)
  response.end()
}

const readJSON = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString("utf8")
  return body === "" ? {} : JSON.parse(body)
}

const listen = (server, port) =>
  new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", resolve)
  })

const identityFixture = (id, email, roles) => ({
  id,
  schema_id: "default",
  schema_url: "http://127.0.0.1:4557/schemas/default",
  state: "active",
  traits: { email },
  metadata_admin: { roles },
  metadata_public: {},
  created_at: fixedTime,
  updated_at: fixedTime,
})

const managedClientFixture = () => ({
  client_id: "managed-client",
  client_name: "Managed MCP Client",
  redirect_uris: ["http://127.0.0.1:37123/callback"],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  scope: "openid mcp:tools",
  token_endpoint_auth_method: "none",
  audience: ["https://auth.vkwave.com/mcp"],
  created_at: fixedTime,
  updated_at: fixedTime,
  metadata: {
    vkwave_mcp: {
      managed_by: "mcp-oauth-adapter",
      source: "cimd",
      source_uri: "https://client.example.test/metadata.json",
      generation: "generation-1",
      created_at: fixedTime,
      last_seen_at: fixedTime,
      lease_until: "2026-07-20T00:00:00Z",
      expires_at: "2026-08-19T00:00:00Z",
    },
  },
})

export const startMockOry = async () => {
  const issuer = "http://127.0.0.1:4555"
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const publicJWK = {
    ...(await exportJWK(publicKey)),
    kid: "e2e-signing-key",
    alg: "RS256",
    use: "sig",
  }
  const codes = new Map()
  let identities
  let clients
  let sessions
  let consents

  const reset = () => {
    codes.clear()
    identities = new Map([
      [
        operatorIdentityID,
        identityFixture(
          operatorIdentityID,
          "administrator@example.test",
          ["auth_admin"],
        ),
      ],
      [
        targetIdentityID,
        identityFixture(targetIdentityID, "operator@example.test", [
          "security_operator",
        ]),
      ],
    ])
    clients = new Map([["managed-client", managedClientFixture()]])
    sessions = new Map([
      [
        "session-target",
        {
          id: "session-target",
          active: true,
          expires_at: "2026-07-20T00:00:00Z",
          authenticated_at: fixedTime,
          identity: identities.get(targetIdentityID),
        },
      ],
    ])
    consents = [
      {
        consent_request_id: "consent-target",
        consent_request: {
          subject: targetIdentityID,
          client: {
            ...clients.get("managed-client"),
            client_secret: "must-not-reach-the-browser",
          },
        },
        grant_scope: ["openid", "mcp:tools"],
        context: { email: "must-not-reach-the-browser@example.test" },
      },
    ]
  }
  reset()

  const publicServer = createServer(async (request, response) => {
    const url = new URL(request.url, issuer)
    if (request.method === "POST" && url.pathname === "/__test__/reset") {
      reset()
      return json(response, 200, { reset: true })
    }
    if (request.method === "POST" && url.pathname === "/__test__/identity") {
      const body = await readJSON(request)
      const identity = identities.get(operatorIdentityID)
      identity.state = body.state
      identity.metadata_admin = { roles: body.roles }
      return json(response, 200, { updated: true })
    }
    if (request.method === "GET" && url.pathname === "/oauth2/auth") {
      if (
        url.searchParams.get("code_challenge_method") !== "S256" ||
        url.searchParams.get("acr_values") !== "aal2" ||
        !url.searchParams.get("nonce")
      ) {
        return json(response, 400, { error: "invalid_authorization_request" })
      }
      const code = `code-${codes.size + 1}`
      codes.set(code, {
        nonce: url.searchParams.get("nonce"),
        redirectURI: url.searchParams.get("redirect_uri"),
      })
      const redirect = new URL(url.searchParams.get("redirect_uri"))
      redirect.searchParams.set("code", code)
      redirect.searchParams.set("state", url.searchParams.get("state"))
      response.writeHead(302, { location: redirect.href })
      return response.end()
    }
    if (request.method === "POST" && url.pathname === "/oauth2/token") {
      const body = new URLSearchParams(
        Buffer.from((await readJSONBody(request))).toString("utf8"),
      )
      const code = codes.get(body.get("code"))
      if (!code || !body.get("code_verifier")) {
        return json(response, 400, { error: "invalid_grant" })
      }
      codes.delete(body.get("code"))
      const identity = identities.get(operatorIdentityID)
      const idToken = await new SignJWT({ nonce: code.nonce, acr: "aal2" })
        .setProtectedHeader({ alg: "RS256", kid: publicJWK.kid })
        .setIssuer(issuer)
        .setAudience("vkwave-auth-admin")
        .setSubject(identity.id)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey)
      return json(response, 200, {
        access_token: "e2e-access-token",
        token_type: "bearer",
        expires_in: 300,
        id_token: idToken,
      })
    }
    if (request.method === "GET" && url.pathname === "/.well-known/jwks.json") {
      return json(response, 200, { keys: [publicJWK] })
    }
    if (request.method === "GET" && url.pathname === "/userinfo") {
      return json(response, 200, { sub: operatorIdentityID })
    }
    return json(response, 404, { error: "not_found" })
  })

  const hydraAdmin = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1:4556")
    if (url.pathname === "/health/ready") {
      return json(response, 200, { status: "ok" })
    }
    if (url.pathname === "/admin/clients") {
      if (request.method === "GET") {
        return json(response, 200, [...clients.values()])
      }
      if (request.method === "POST") {
        const body = await readJSON(request)
        const client = {
          ...body,
          created_at: fixedTime,
          updated_at: fixedTime,
        }
        clients.set(client.client_id, client)
        return json(response, 201, client)
      }
    }
    if (url.pathname.startsWith("/admin/clients/")) {
      const id = decodeURIComponent(url.pathname.slice("/admin/clients/".length))
      const current = clients.get(id)
      if (!current) return json(response, 404, { error: "not_found" })
      if (request.method === "GET") return json(response, 200, current)
      if (request.method === "PUT") {
        const updated = { ...(await readJSON(request)), client_id: id }
        clients.set(id, updated)
        return json(response, 200, updated)
      }
      if (request.method === "PATCH") {
        const patch = await readJSON(request)
        const updated = { ...current }
        for (const operation of patch) {
          if (operation.op === "replace" && operation.path === "/client_secret") {
            updated.client_secret = operation.value
          }
        }
        clients.set(id, updated)
        return json(response, 200, updated)
      }
      if (request.method === "DELETE") {
        clients.delete(id)
        return empty(response)
      }
    }
    if (
      request.method === "DELETE" &&
      url.pathname === "/admin/oauth2/tokens"
    ) {
      return empty(response)
    }
    if (url.pathname === "/admin/oauth2/auth/sessions/consent") {
      const subject = url.searchParams.get("subject")
      const client = url.searchParams.get("client")
      if (request.method === "GET") {
        return json(
          response,
          200,
          consents.filter(
            (consent) => consent.consent_request.subject === subject,
          ),
        )
      }
      if (request.method === "DELETE") {
        consents = consents.filter(
          (consent) =>
            consent.consent_request.subject !== subject ||
            (client && consent.consent_request.client.client_id !== client),
        )
        return empty(response)
      }
    }
    return json(response, 404, { error: "not_found" })
  })

  const kratosAdmin = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1:4557")
    if (url.pathname === "/health/ready") {
      return json(response, 200, { status: "ok" })
    }
    if (request.method === "GET" && url.pathname === "/admin/identities") {
      return json(response, 200, [...identities.values()])
    }
    const identitySessions = url.pathname.match(
      /^\/admin\/identities\/([^/]+)\/sessions$/,
    )
    if (identitySessions) {
      const id = decodeURIComponent(identitySessions[1])
      if (request.method === "GET") {
        return json(
          response,
          200,
          [...sessions.values()].filter((session) => session.identity.id === id),
        )
      }
      if (request.method === "DELETE") {
        for (const [sessionID, session] of sessions) {
          if (session.identity.id === id) sessions.delete(sessionID)
        }
        return empty(response)
      }
    }
    const identityPath = url.pathname.match(/^\/admin\/identities\/([^/]+)$/)
    if (identityPath) {
      const id = decodeURIComponent(identityPath[1])
      const identity = identities.get(id)
      if (!identity) return json(response, 404, { error: "not_found" })
      if (request.method === "GET") return json(response, 200, identity)
      if (request.method === "PUT") {
        const updated = { ...identity, ...(await readJSON(request)), id }
        identities.set(id, updated)
        return json(response, 200, updated)
      }
      if (request.method === "DELETE") {
        identities.delete(id)
        return empty(response)
      }
    }
    if (request.method === "GET" && url.pathname === "/admin/sessions") {
      return json(response, 200, [...sessions.values()])
    }
    const sessionPath = url.pathname.match(/^\/admin\/sessions\/([^/]+)$/)
    if (sessionPath && request.method === "DELETE") {
      sessions.delete(decodeURIComponent(sessionPath[1]))
      return empty(response)
    }
    if (
      request.method === "GET" &&
      url.pathname === "/admin/courier/messages"
    ) {
      return json(response, 200, [])
    }
    return json(response, 404, { error: "not_found" })
  })

  const adapter = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1:4558")
    const promotion = url.pathname.match(
      /^\/internal\/v1\/clients\/([^/]+)\/promote$/,
    )
    if (request.method === "POST" && promotion) {
      const id = decodeURIComponent(promotion[1])
      const client = clients.get(id)
      const body = await readJSON(request)
      if (
        !client ||
        client.metadata?.vkwave_mcp?.generation !== body.expected_generation
      ) {
        return json(response, 409, { error: "generation_mismatch" })
      }
      const metadata = { ...(client.metadata ?? {}) }
      delete metadata.vkwave_mcp
      clients.set(id, { ...client, metadata })
      return json(response, 200, { client_id: id, promoted: true })
    }
    return json(response, 404, { error: "not_found" })
  })

  await Promise.all([
    listen(publicServer, 4555),
    listen(hydraAdmin, 4556),
    listen(kratosAdmin, 4557),
    listen(adapter, 4558),
  ])
  return {
    close: () =>
      Promise.all(
        [publicServer, hydraAdmin, kratosAdmin, adapter].map(
          (server) => new Promise((resolve) => server.close(resolve)),
        ),
      ),
  }
}

const readJSONBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks)
}
