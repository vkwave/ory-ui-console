import { type NextRequest, NextResponse } from "next/server"

import { completeAuthorization } from "@/lib/auth/oidc"
import { loadConfig } from "@/lib/config"

const fixedRedirect = (path: string): NextResponse =>
  NextResponse.redirect(new URL(path, loadConfig().adminOrigin))

export const GET = async (request: NextRequest): Promise<Response> => {
  const query = request.nextUrl.searchParams
  if (query.getAll("error").length > 0) {
    return fixedRedirect("/login?error=oauth_callback")
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
    return fixedRedirect("/login?error=oauth_callback")
  }
  return fixedRedirect("/dashboard")
}
