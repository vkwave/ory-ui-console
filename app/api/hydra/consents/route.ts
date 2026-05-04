import { NextRequest, NextResponse } from "next/server";
import { hydra } from "@/lib/ory/hydra";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subject = req.nextUrl.searchParams.get("subject") ?? "";
  try {
    const data = await hydra.listConsentSessions(subject);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subject = req.nextUrl.searchParams.get("subject") ?? "";
  const client = req.nextUrl.searchParams.get("client") ?? undefined;
  try {
    await hydra.revokeConsentSessions(subject, client);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
