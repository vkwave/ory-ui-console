import { z } from "zod"

import { clientOperations } from "@/lib/hydra/client-operations"
import { ClientLifecycleError } from "@/lib/hydra/lifecycle"
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
      action: "oauth_client.rotate",
      targetType: "oauth_client",
      targetID: id,
      before: { client_id: id },
      after: { client_id: id },
      operation: () => clientOperations.rotate(id),
    })
    if (!client.client_secret) {
      throw new ClientLifecycleError("rotation_secret_missing", 502)
    }
    return Response.json(
      { client_id: id, client_secret: client.client_secret },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return safeErrorResponse(error)
  }
}
