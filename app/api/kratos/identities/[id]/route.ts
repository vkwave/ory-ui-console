import { z } from "zod"

import { identityOperations } from "@/lib/kratos/identity-operations"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

const stateSchema = z.object({ state: z.enum(["active", "inactive"]) }).strict()
const confirmationSchema = z.object({ confirmation: z.string().min(1) }).strict()

export const PATCH = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, stateSchema)
    const identity = await runAuditedOperation({
      request,
      ...mutation,
      action: "identity.state.update",
      targetType: "identity",
      targetID: id,
      before: { identity_id: id },
      after: { identity_id: id, state: mutation.body.state },
      operation: () => identityOperations.updateState(id, mutation.body.state),
    })
    return Response.json(identity, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}

export const DELETE = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, confirmationSchema)
    await runAuditedOperation({
      request,
      ...mutation,
      action: "identity.delete",
      targetType: "identity",
      targetID: id,
      before: { identity_id: id },
      operation: () =>
        identityOperations.delete(
          id,
          mutation.body.confirmation,
          mutation.admin.subject,
        ),
    })
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
