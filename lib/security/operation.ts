import "server-only"

import { randomUUID } from "node:crypto"

import type { SessionData } from "@/lib/session"
import { audit, type AuditEvent } from "@/lib/security/audit"

interface AuditedOperation<T> {
  request: Request
  admin: NonNullable<SessionData["admin"]>
  idempotencyKey: string
  action: string
  targetType: string
  targetID: string
  before?: AuditEvent["before"]
  after?: AuditEvent["after"]
  operation: () => Promise<T>
}

export const runAuditedOperation = async <T>({
  request,
  admin,
  idempotencyKey,
  action,
  targetType,
  targetID,
  before,
  after,
  operation,
}: AuditedOperation<T>): Promise<T> => {
  const base = {
    actorSubject: admin.subject,
    action,
    targetType,
    targetID,
    requestID: request.headers.get("x-request-id") ?? randomUUID(),
    clientAddress: request.headers.get("x-forwarded-for")?.split(",", 1)[0],
    idempotencyKey,
  }
  try {
    const result = await operation()
    audit({ ...base, result: "success", before, after })
    return result
  } catch (error) {
    audit({ ...base, result: "failure", before })
    throw error
  }
}
