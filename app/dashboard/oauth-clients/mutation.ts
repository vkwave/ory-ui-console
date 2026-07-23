"use client"

interface MutationOptions {
  method: "POST" | "PUT" | "PATCH" | "DELETE"
  body: unknown
}

interface MutationDependencies {
  fetch?: typeof fetch
  origin?: string
  idempotencyKey?: () => string
}

interface SessionDTO {
  csrfToken: string
}

const responseJSON = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export const mutateConsole = async <T = unknown>(
  path: string,
  options: MutationOptions,
  dependencies: MutationDependencies = {},
): Promise<T> => {
  const request = dependencies.fetch ?? fetch
  const sessionResponse = await request("/api/session", { cache: "no-store" })
  if (!sessionResponse.ok) throw new Error("admin_session_unavailable")
  const session = (await responseJSON(sessionResponse)) as Partial<SessionDTO>
  if (!session.csrfToken) throw new Error("admin_session_invalid")

  const response = await request(path, {
    method: options.method,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "idempotency-key":
        dependencies.idempotencyKey?.() ?? crypto.randomUUID(),
      origin: dependencies.origin ?? window.location.origin,
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify(options.body),
  })
  const result = await responseJSON(response)
  if (!response.ok) {
    const code =
      result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "operation_failed"
    throw new Error(code)
  }
  return result as T
}

export const mutateOAuthClient = mutateConsole
