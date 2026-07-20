import { spawn } from "node:child_process"

import { startMockOry } from "../test/mock-ory.mjs"

const mocks = await startMockOry()
const next = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      CONSOLE_DEPLOYMENT_MODE: "development",
      AUTH_ADMIN_URL: "http://127.0.0.1:3100",
      OIDC_ISSUER: "http://127.0.0.1:4555",
      OIDC_CLIENT_ID: "vkwave-auth-admin",
      OIDC_CLIENT_SECRET: "e2e-console-client-secret-32-characters",
      OIDC_REDIRECT_URI: "http://127.0.0.1:3100/api/auth/callback",
      OIDC_REQUIRED_ACR: "aal2",
      HYDRA_PUBLIC_URL: "http://127.0.0.1:4555",
      HYDRA_ADMIN_URL: "http://127.0.0.1:4556",
      KRATOS_ADMIN_URL: "http://127.0.0.1:4557",
      ADAPTER_INTERNAL_URL: "http://127.0.0.1:4558",
      ADAPTER_CONSOLE_CLIENT_ID: "auth-admin-console",
      ADAPTER_CONSOLE_CLIENT_SECRET: "e2e-adapter-client-secret-32-characters",
      SESSION_SECRET: "e2e-session-secret-with-32-characters",
      SESSION_COOKIE_NAME: "vkwave_admin_e2e",
      ADMIN_ROLE: "auth_admin",
      SECURITY_OPERATOR_ROLE: "security_operator",
      ROLE_RECHECK_SECONDS: "300",
      CONSOLE_ALLOW_INSECURE_DEV: "true",
    },
  },
)

const stop = async (signal) => {
  next.kill(signal)
  await mocks.close()
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stop(signal).finally(() => process.exit(0))
  })
}

next.on("exit", async (code) => {
  await mocks.close()
  process.exit(code ?? 1)
})
