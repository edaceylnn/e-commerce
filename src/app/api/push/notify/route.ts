import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push/send";

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "EDACEY";
  const message =
    typeof body.message === "string"
      ? body.message
      : "Favori ürününüz yeniden stokta!";

  const { sent, total } = await sendPushToAll(title, message);
  return NextResponse.json({ ok: true, sent, total });
}
