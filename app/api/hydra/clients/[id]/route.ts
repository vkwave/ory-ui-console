import { z } from "zod"

import { clientOperations } from "@/lib/hydra/client-operations"
import { oauthClientFormSchema } from "@/lib/hydra/client-schema"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

const confirmationSchema = z.object({ confirmation: z.string().min(1) }).strict()

export const PUT = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, oauthClientFormSchema)
    const client = await runAuditedOperation({
      request,
      ...mutation,
      action: "oauth_client.update",
      targetType: "oauth_client",
      targetID: id,
      before: { client_id: id },
      after: { client_id: id },
      operation: () => clientOperations.update(id, mutation.body),
    })
    return Response.json(client, {
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
      action: "oauth_client.delete",
      targetType: "oauth_client",
      targetID: id,
      before: { client_id: id },
      operation: () => clientOperations.delete(id, mutation.body.confirmation),
    })
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
