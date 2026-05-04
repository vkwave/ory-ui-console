import { NextRequest, NextResponse } from "next/server";
import { kratos } from "@/lib/ory/kratos";
import { getSession } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await kratos.revokeAllSessions(id);
  return NextResponse.json({ ok: true });
}
