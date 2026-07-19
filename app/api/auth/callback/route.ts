import { type NextRequest, NextResponse } from "next/server"

import { completeAuthorization } from "@/lib/auth/oidc"

const fixedRedirect = (request: NextRequest, path: string): NextResponse =>
  NextResponse.redirect(new URL(path, request.url))

export const GET = async (request: NextRequest): Promise<Response> => {
  const query = request.nextUrl.searchParams
  if (query.getAll("error").length > 0) {
    return fixedRedirect(request, "/login?error=oauth_callback")
  }

  const codes = query.getAll("code")
  const states = query.getAll("state")
  if (
    codes.length !== 1 ||
    states.length !== 1 ||
    !codes[0] ||
    !states[0]
  ) {
    return Response.json({ error: "invalid_callback" }, { status: 400 })
  }

  try {
    await completeAuthorization(codes[0], states[0])
  } catch {
    return fixedRedirect(request, "/login?error=oauth_callback")
  }
  return fixedRedirect(request, "/dashboard")
}
