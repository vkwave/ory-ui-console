import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  // req.cookies (RequestCookies) is structurally compatible with iron-session's
  // CookieStore interface at runtime; cast needed to satisfy the internal type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(req.cookies as any, {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "ory_console_session",
    password: process.env.SESSION_SECRET ?? "fallback-dev-secret-must-be-32-chars",
  });

  if (!session.admin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
