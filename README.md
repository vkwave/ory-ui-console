# VKWAVE Auth Console

VKWAVE Auth Console is a source-owned administrator console for the VKWAVE
ORY authentication stack. It provides server-rendered, curated operations for
Kratos identities and sessions, Hydra OAuth clients and consent sessions, and
the MCP OAuth adapter. It is a fork of
[`THEDANIIEL/ory-ui-console`](https://github.com/THEDANIIEL/ory-ui-console);
upstream synchronization is recorded in [UPSTREAM.md](UPSTREAM.md).

## Security model

- The browser uses Hydra Authorization Code + PKCE through the canonical
  public issuer. Static email/password credentials do not exist.
- Hydra and Kratos administrator APIs are reachable only from the Next.js
  server through fixed internal URLs. Request data can never override them.
- The session is encrypted, host-only, HttpOnly, SameSite=Lax, and Secure in
  production. Mutations require an exact Origin, CSRF token, JSON body limit,
  fresh Kratos role check, and idempotency key.
- Adapter-managed OAuth clients are read-only until an explicit,
  generation-checked promotion. Read pages never return client secrets,
  registration tokens, courier bodies, or consent context.
- Production identity schemas and courier delivery are read-only. Audit events
  contain opaque subject/object IDs and scalar summaries only.

## Required environment

```env
NODE_ENV=production
CONSOLE_DEPLOYMENT_MODE=production
AUTH_ADMIN_URL=https://auth-admin.example.test
OIDC_ISSUER=https://auth.example.test
OIDC_CLIENT_ID=vkwave-auth-admin
OIDC_CLIENT_SECRET=replace-with-a-32-character-secret
OIDC_REDIRECT_URI=https://auth-admin.example.test/api/auth/callback
OIDC_REQUIRED_ACR=aal2
HYDRA_PUBLIC_URL=http://hydra-public:4444
HYDRA_ADMIN_URL=http://hydra-admin:4445
KRATOS_ADMIN_URL=http://kratos-admin:4434
ADAPTER_INTERNAL_URL=http://mcp-oauth-adapter:8081
ADAPTER_CONSOLE_CLIENT_ID=auth-admin-console
ADAPTER_CONSOLE_CLIENT_SECRET=replace-with-a-32-character-secret
SESSION_SECRET=replace-with-a-32-character-secret
SESSION_COOKIE_NAME=__Host-vkwave_admin
ADMIN_ROLE=auth_admin
SECURITY_OPERATOR_ROLE=security_operator
ROLE_RECHECK_SECONDS=300
CONSOLE_ALLOW_INSECURE_DEV=false
```

`CONSOLE_DEPLOYMENT_MODE` is the runtime security-policy selector and defaults
to `production`; it does not derive from Next.js `NODE_ENV`. `AUTH_ADMIN_URL`
and `OIDC_REDIRECT_URI` must share an origin and the exact callback path.
Production requires HTTPS for the public issuer and console origin, forbids
the insecure development override, and requires a `__Host-` session cookie
name. `HYDRA_PUBLIC_URL`,
`HYDRA_ADMIN_URL`, `KRATOS_ADMIN_URL`, and `ADAPTER_INTERNAL_URL` are server
network addresses; they are never exposed to browser code.

## Local development

Use Node.js 22 and npm:

```bash
npm ci
npm run dev
```

For local HTTP only, set `CONSOLE_DEPLOYMENT_MODE=development`, use a
non-production cookie name, and set `CONSOLE_ALLOW_INSECURE_DEV=true`.
Released Next.js images continue to run with `NODE_ENV=production`; deployment
mode is evaluated independently at runtime. The local OIDC client still needs
an exact callback at `/api/auth/callback`.

## Compose

The standalone compose file runs only the console and joins an existing
internal network. Hydra, Kratos, the adapter, and the reverse proxy remain
separate services. Provide every secret explicitly; the compose file has no
default administrator password or session secret.

```bash
docker compose up --build -d
```

Keep Hydra/Kratos administrator ports private. The public reverse proxy should
publish only `AUTH_ADMIN_URL` and route `/api/auth/*` plus the dashboard to
this service.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The browser integration suite uses local mock OIDC, Hydra, Kratos, and adapter
servers. A real login must be verified again in the auth-stack Compose
integration environment before production promotion.

The complete deployment and bootstrap contract is in
[SECURITY-PRODUCTION.md](SECURITY-PRODUCTION.md).

## License and upstream

The upstream project and its dependencies retain their original licenses and
attributions. VKWAVE product branding and administrator copy are maintained in
source files in this fork; runtime overlays are not supported.
