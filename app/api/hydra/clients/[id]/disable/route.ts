import { z } from "zod"

import { clientOperations } from "@/lib/hydra/client-operations"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

const disableSchema = z.object({ disabled: z.boolean() }).strict()

export const POST = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, disableSchema)
    const client = await runAuditedOperation({
      request,
      ...mutation,
      action: mutation.body.disabled
        ? "oauth_client.disable"
        : "oauth_client.enable",
      targetType: "oauth_client",
      targetID: id,
      before: { client_id: id },
      after: { client_id: id, disabled: mutation.body.disabled },
      operation: () =>
        clientOperations.setDisabled(id, mutation.body.disabled),
    })
    return Response.json(client, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
