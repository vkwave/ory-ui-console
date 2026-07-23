import { z } from "zod"

import { identityOperations } from "@/lib/kratos/identity-operations"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

interface RouteContext {
  params: Promise<{ id: string }>
}

const rolesSchema = z
  .object({
    roles: z.array(z.enum(["auth_admin", "security_operator"])).max(2),
  })
  .strict()

export const PUT = async (
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const { id } = await context.params
    const mutation = await requireMutation(request, rolesSchema)
    const identity = await runAuditedOperation({
      request,
      ...mutation,
      action: "identity.roles.update",
      targetType: "identity",
      targetID: id,
      before: { identity_id: id },
      after: { identity_id: id },
      operation: () => identityOperations.updateRoles(id, mutation.body.roles),
    })
    return Response.json(identity, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
