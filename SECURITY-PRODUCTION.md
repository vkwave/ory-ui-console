# Production security contract

This repository is the VKWAVE-owned administrator console fork. It is a
privileged control-plane UI, not an OAuth server and not an arbitrary reverse
proxy. Hydra remains the only OAuth/OIDC issuer, Kratos remains the identity
service, and all ORY admin operations run from this server-side application.

## Runtime configuration

Production must provide every value below through the auth-stack deployment
secret mechanism. Do not commit a `.env` file or place these values in a
browser-exposed variable:

- `NODE_ENV=production` and `CONSOLE_ALLOW_INSECURE_DEV=false`.
- `AUTH_ADMIN_URL=https://auth-admin.vkwave.com` and an exact
  `OIDC_REDIRECT_URI` ending in `/api/auth/callback` on the same origin.
- `OIDC_ISSUER=https://auth.vkwave.com`, `OIDC_CLIENT_ID`, and a rotated
  `OIDC_CLIENT_SECRET` for the confidential console client.
- `HYDRA_PUBLIC_URL`, `HYDRA_ADMIN_URL`, `KRATOS_ADMIN_URL`, and
  `ADAPTER_INTERNAL_URL` as fixed private container-network URLs. These are
  never accepted from request parameters or emitted to browser code.
- `ADAPTER_CONSOLE_CLIENT_ID` and a least-privilege
  `ADAPTER_CONSOLE_CLIENT_SECRET` used only for the adapter's private console
  management API.
- `SESSION_SECRET` with at least 32 random characters and a host-only
  `SESSION_COOKIE_NAME` beginning with `__Host-`.
- `ADMIN_ROLE=auth_admin`, `SECURITY_OPERATOR_ROLE=security_operator`, and a
  `ROLE_RECHECK_SECONDS` value between 30 and 900 (the normal value is 300).

The public browser authorization request always names the canonical issuer.
The server exchanges codes, reads JWKS/UserInfo, and calls Hydra/Kratos/adapter
admin endpoints only through the fixed internal URLs above. Production requires
HTTPS for the public issuer and console origin. No parent-domain cookie is
allowed; Kratos and console sessions stay host-only on their respective hosts.

## Administrator bootstrap

There is no static administrator password and no default identity. An operator
must first create and verify a Kratos identity, then run the parent
`auth-stack` Compose profile with an explicit UUID:

```bash
BOOTSTRAP_IDENTITY_ID=<verified-kratos-identity-uuid> \
  docker compose --profile bootstrap run --rm administrator-bootstrap
```

The one-shot image command is exactly `node dist/scripts/bootstrap-admin.js`.
It reads only `BOOTSTRAP_IDENTITY_ID` and `KRATOS_ADMIN_URL`, accepts only a
UUID, requires an active identity, preserves unrelated metadata/traits, and
idempotently adds `metadata_admin.roles[]=auth_admin`. The bootstrap profile is
never enabled on the long-running console service and must not be exposed to
the public proxy.

## Request and authorization boundaries

- Hydra Authorization Code + PKCE, state, nonce, issuer, audience, expiry, and
  `acr=aal2` are verified before a console session is created.
- Every sensitive read and every mutation rechecks the active Kratos identity
  and administrator role. Mutations additionally require the exact Origin,
  CSRF token, JSON content type, bounded body size, and idempotency key.
- Hydra and Kratos admin SDKs are instantiated with fixed endpoints. There is
  no catch-all proxy, URL forwarding, browser admin client, or user-selectable
  upstream.
- Adapter-managed OAuth clients are read-only until an explicit,
  generation-checked promotion. Client secrets are shown only once after a
  successful rotation and never returned by list/detail reads.
- Identity traits, passwords, access/ID/refresh tokens, authorization codes,
  cookies, consent context, courier message bodies/subjects, and upstream error
  bodies are not displayed or written to audit logs.

## Audit, operations, and retention

The console emits structured audit events containing only opaque subject IDs,
stable object IDs, operation names, result codes, and bounded scalar summaries.
The deployment owner must forward these events to the external audit sink,
restrict sink access, alert on repeated authorization failures/bootstrap
errors, and retain records according to the organization's security policy.
The console does not make retention or deletion decisions for that external
sink, and its application logs must not be treated as the audit record.

Health degradation puts the UI into read-only behavior where possible. Keep
Hydra/Kratos admin listeners on private control networks, publish only the
auth-router, and run the container as UID/GID 10001. Consume images by an
immutable GHCR digest and verify the keyless Cosign signature and SBOM before
promotion.

## Image and upstream policy

The release workflow accepts only `1.0.0-vkwave.N` tags, refuses an existing
GHCR release tag, records the reviewed commit and CIMD fixture SHA-256, emits
SBOM/provenance, and signs the pushed digest. Runtime bind mounts, `sed`, Nginx
`sub_filter`, compiled-bundle replacement, and other overlays are forbidden.
Branding, security behavior, and translations are source changes in this fork.

Upstream synchronization uses a dedicated branch and review PR. Every sync
records the old/new upstream revisions, retained VKWAVE patches, conflicts,
security changes, and browser-flow evidence. Public history is never rewritten
to conceal the fork's divergence.
