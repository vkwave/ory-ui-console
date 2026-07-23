import "server-only"

import { loadConfig } from "@/lib/config"

export interface OryHealth {
  hydra: boolean
  kratos: boolean
  degraded: boolean
  readOnly: boolean
}

interface HealthDependencies {
  env?: NodeJS.ProcessEnv
  fetch?: typeof fetch
}

const readyURL = (base: URL): URL => new URL("/health/ready", base.origin)

const ready = async (request: typeof fetch, url: URL): Promise<boolean> => {
  try {
    const response = await request(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch {
    return false
  }
}

export const checkOryHealth = async ({
  env = process.env,
  fetch: request = fetch,
}: HealthDependencies = {}): Promise<OryHealth> => {
  const config = loadConfig(env)
  const [hydra, kratos] = await Promise.all([
    ready(request, readyURL(config.hydraAdminURL)),
    ready(request, readyURL(config.kratosAdminURL)),
  ])
  const degraded = !hydra || !kratos

  return { hydra, kratos, degraded, readOnly: degraded }
}
