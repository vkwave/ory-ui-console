import { NextResponse } from "next/server"

import { beginAuthorization } from "@/lib/auth/oidc"

export const GET = async (): Promise<NextResponse> =>
  NextResponse.redirect(await beginAuthorization())
