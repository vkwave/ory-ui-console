import { getIronSession } from "iron-session"
import { type NextRequest, NextResponse } from "next/server"

import { sessionOptions, type SessionData } from "@/lib/session"

const publicPaths = new Set([
  "/api/auth/start",
  "/api/auth/callback",
])

export async function proxy(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname
  if (publicPaths.has(pathname) || pathname.startsWith("/health/")) {
    return NextResponse.next()
  }

  const session = await getIronSession<SessionData>(
    request.cookies as never,
    sessionOptions(),
  )
  if (session.admin) return NextResponse.next()

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "unauthenticated" }, { status: 401 })
  }
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/health/:path*"],
}
