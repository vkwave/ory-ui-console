import { z } from "zod"

import { requireAdmin } from "@/lib/auth/require-admin"
import { hydra } from "@/lib/ory/hydra"
import { safeErrorResponse } from "@/lib/security/errors"
import { runAuditedOperation } from "@/lib/security/operation"
import { requireMutation } from "@/lib/security/request"

const subjectSchema = z.string().min(1).max(256)
const revokeSchema = z
  .object({
    subject: subjectSchema,
    client: z.string().min(1).max(256).optional(),
  })
  .strict()

export const GET = async (request: Request): Promise<Response> => {
  try {
    await requireAdmin(false)
    const subject = subjectSchema.parse(new URL(request.url).searchParams.get("subject"))
    const sessions = await hydra.listConsentSessions(subject)
    return Response.json(sessions, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return safeErrorResponse(error)
  }
}

export const DELETE = async (request: Request): Promise<Response> => {
  try {
    const mutation = await requireMutation(request, revokeSchema)
    await runAuditedOperation({
      request,
      ...mutation,
      action: "consent.revoke",
      targetType: "identity",
      targetID: mutation.body.subject,
      before: {
        identity_id: mutation.body.subject,
        client_id: mutation.body.client ?? null,
      },
      operation: () =>
        hydra.revokeConsentSessions(
          mutation.body.subject,
          mutation.body.client,
        ),
    })
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return safeErrorResponse(error)
  }
}
