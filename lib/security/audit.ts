import "server-only"

import { safeSummary, type AuditSummary } from "./redact"

export interface AuditEvent {
  actorSubject: string
  action: string
  targetType: string
  targetID: string
  requestID: string
  clientAddress?: string
  result: "success" | "failure"
  before?: AuditSummary
  after?: AuditSummary
  idempotencyKey: string
}

export const audit = (event: AuditEvent): void => {
  const { before, after, ...safeEvent } = event
  process.stdout.write(
    `${JSON.stringify({
      type: "vkwave.auth.audit",
      occurred_at: new Date().toISOString(),
      ...safeEvent,
      clientAddress: event.clientAddress?.slice(0, 64),
      before: safeSummary(before, Object.keys(before ?? {})),
      after: safeSummary(after, Object.keys(after ?? {})),
    })}\n`,
  )
}
