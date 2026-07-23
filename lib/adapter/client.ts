import "server-only"

import { z } from "zod"

import { loadConfig } from "@/lib/config"

const promotionResponseSchema = z
  .object({
    client_id: z.string().min(1),
    promoted: z.literal(true),
  })
  .strict()

export type PromotionResponse = z.infer<typeof promotionResponseSchema>

export class AdapterClientError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code = "adapter_promotion_failed") {
    super("MCP OAuth adapter request failed")
    this.name = "AdapterClientError"
    this.status = status
    this.code = code
  }

  toJSON(): { status: number; code: string; message: string } {
    return { status: this.status, code: this.code, message: this.message }
  }
}

interface AdapterDependencies {
  env?: NodeJS.ProcessEnv
  fetch?: typeof fetch
}

export const createAdapterClient = ({
  env = process.env,
  fetch: request = fetch,
}: AdapterDependencies = {}) => {
  const config = loadConfig(env)
  const authorization = `Basic ${Buffer.from(
    `${config.adapterClientID}:${config.adapterClientSecret}`,
  ).toString("base64")}`

  return {
    promoteClient: async (
      clientID: string,
      expectedGeneration: string,
    ): Promise<PromotionResponse> => {
      const url = new URL(
        `/internal/v1/clients/${encodeURIComponent(clientID)}/promote`,
        config.adapterInternalURL.origin,
      )
      let response: Response
      try {
        response = await request(url, {
          method: "POST",
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
          headers: {
            authorization,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            expected_generation: expectedGeneration,
            reason: "operator promotion from administrator console",
          }),
        })
      } catch {
        throw new AdapterClientError(503)
      }
      if (!response.ok) {
        throw new AdapterClientError(
          response.status >= 400 && response.status <= 599
            ? response.status
            : 503,
        )
      }
      try {
        return promotionResponseSchema.parse(await response.json())
      } catch {
        throw new AdapterClientError(502, "adapter_invalid_response")
      }
    },
  }
}

let adapter: ReturnType<typeof createAdapterClient> | undefined

export const getAdapterClient = (): ReturnType<typeof createAdapterClient> => {
  adapter ??= createAdapterClient()
  return adapter
}
