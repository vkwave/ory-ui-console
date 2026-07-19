import { z } from "zod"

import { kratos } from "@/lib/ory/kratos"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

export const DELETE = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, z.object({}).strict())
    await runAuditedOperation({
      request,
      ...mutation,
      action: "session.revoke",
      targetType: "session",
      targetID: id,
      before: { session_id: id },
      operation: () => kratos.revokeSession(id),
    })
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
