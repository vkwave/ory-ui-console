import { z } from "zod"

import { clientOperations } from "@/lib/hydra/client-operations"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

export const POST = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, z.object({}).strict())
    const client = await runAuditedOperation({
      request,
      ...mutation,
      action: "oauth_client.promote",
      targetType: "oauth_client",
      targetID: id,
      before: { client_id: id },
      after: { client_id: id },
      operation: () => clientOperations.promote(id),
    })
    return Response.json(client, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
