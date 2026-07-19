import "server-only"

import { ZodError } from "zod"

import { AdapterClientError } from "@/lib/adapter/client"
import { ClientLifecycleError } from "@/lib/hydra/lifecycle"
import { OryAdminError } from "@/lib/ory/result"

export const safeErrorResponse = (error: unknown): Response => {
  if (error instanceof Response) return error
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }
  if (error instanceof OryAdminError) {
    return Response.json(
      { error: error.code },
      { status: error.status >= 500 ? 503 : error.status },
    )
  }
  if (
    error instanceof ClientLifecycleError ||
    error instanceof AdapterClientError
  ) {
    return Response.json({ error: error.code }, { status: error.status })
  }
  return Response.json({ error: "internal_error" }, { status: 500 })
}
