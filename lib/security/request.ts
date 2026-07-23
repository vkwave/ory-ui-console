import "server-only"

import { timingSafeEqual } from "node:crypto"

import { type z } from "zod"

import { requireAdmin } from "@/lib/auth/require-admin"
import { loadConfig } from "@/lib/config"

const equal = (left: string, right: string): boolean => {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const readLimitedJSON = async <T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 64 * 1024,
): Promise<T> => {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase()
  if (contentType !== "application/json") {
    throw new Response("unsupported media type", { status: 415 })
  }

  const rawLength = request.headers.get("content-length")
  if (rawLength && !/^\d+$/.test(rawLength)) {
    throw new Response("invalid content length", { status: 400 })
  }
  const declared = Number(rawLength ?? "0")
  if (declared > maxBytes) {
    throw new Response("request body too large", { status: 413 })
  }

  const reader = request.body?.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (reader) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Response("request body too large", { status: 413 })
    }
    chunks.push(value)
  }
  const body = Buffer.concat(chunks).toString("utf8")
  return schema.parse(JSON.parse(body || "{}"))
}

interface MutationDependencies {
  env?: NodeJS.ProcessEnv
}

export const requireMutation = async <T>(
  request: Request,
  schema: z.ZodType<T>,
  overrides: MutationDependencies = {},
) => {
  const config = loadConfig(overrides.env)
  if (request.headers.get("origin") !== config.adminOrigin.origin) {
    throw new Response("forbidden origin", { status: 403 })
  }
  const idempotencyKey = request.headers.get("idempotency-key") || ""
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    throw new Response("invalid idempotency key", { status: 400 })
  }
  const admin = await requireAdmin(true)
  const token = request.headers.get("x-csrf-token") || ""
  if (!equal(token, admin.csrfToken)) {
    throw new Response("invalid csrf token", { status: 403 })
  }
  return {
    admin,
    idempotencyKey,
    body: await readLimitedJSON(request, schema),
  }
}
