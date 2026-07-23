import { oauthClientFormSchema } from "@/lib/hydra/client-schema"
import { clientOperations } from "@/lib/hydra/client-operations"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

export const POST = async (request: Request): Promise<Response> => {
  try {
    const mutation = await requireMutation(
      request,
      oauthClientFormSchema,
    )
    const client = await runAuditedOperation({
      request,
      ...mutation,
      action: "oauth_client.create",
      targetType: "oauth_client",
      targetID: mutation.body.client_id,
      after: { client_id: mutation.body.client_id },
      operation: () => clientOperations.create(mutation.body),
    })
    return Response.json(client, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
