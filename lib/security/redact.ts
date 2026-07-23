export type AuditScalar = string | number | boolean | null
export type AuditSummary = Readonly<Record<string, AuditScalar>>

const forbidden =
  /secret|token|code|cookie|password|credential|email|authorization|key/i

export const safeSummary = (
  value: Readonly<Record<string, unknown>> | undefined,
  allowlist: readonly string[],
): AuditSummary => {
  const result: Record<string, AuditScalar> = {}
  for (const key of allowlist) {
    if (forbidden.test(key)) continue
    const item = value?.[key]
    if (typeof item === "string") result[key] = item.slice(0, 256)
    else if (
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      result[key] = item
    }
  }
  return result
}
