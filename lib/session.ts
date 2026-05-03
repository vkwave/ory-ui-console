import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  admin?: { email: string };
}

export const sessionOptions: SessionOptions = {
  cookieName: process.env.SESSION_COOKIE_NAME ?? "ory_console_session",
  password: process.env.SESSION_SECRET ?? "fallback-dev-secret-must-be-32-chars",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
