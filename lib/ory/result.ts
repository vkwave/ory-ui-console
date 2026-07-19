import "server-only"

const message = "ORY administrator API request failed"

const errorCode = (status: number): string => {
  if (status === 404) return "ory_not_found"
  if (status === 409) return "ory_conflict"
  if (status === 429) return "ory_rate_limited"
  if (status >= 500) return "ory_unavailable"
  if (status === 401 || status === 403) return "ory_forbidden"
  return "ory_request_failed"
}

export class OryAdminError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code = errorCode(status), safeMessage = message) {
    super(safeMessage)
    this.name = "OryAdminError"
    this.status = status
    this.code = code
  }

  toJSON(): { status: number; code: string; message: string } {
    return { status: this.status, code: this.code, message: this.message }
  }
}

const statusFrom = (error: unknown): number => {
  if (!error || typeof error !== "object") return 503

  const response = (error as { response?: unknown }).response
  if (!response || typeof response !== "object") return 503

  const status = (response as { status?: unknown }).status
  return typeof status === "number" && status >= 400 && status <= 599
    ? status
    : 503
}

export const normalizeOryError = (error: unknown): OryAdminError =>
  error instanceof OryAdminError ? error : new OryAdminError(statusFrom(error))

export const callOry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    throw normalizeOryError(error)
  }
}
