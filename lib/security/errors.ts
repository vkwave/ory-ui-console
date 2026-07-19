import "server-only"

import { ZodError } from "zod"

export const safeErrorResponse = (error: unknown): Response => {
  if (error instanceof Response) return error
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }
  return Response.json({ error: "internal_error" }, { status: 500 })
}
