import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelOrder } from "@/lib/orders";

// Customer-initiated cancellation — the feature /yardim/kargo-ve-teslimat
// already promises ("kargoya verilmemiş siparişler ... tek tıkla iptal
// edilebilir") but that, until now, had no actual endpoint behind it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const result = await cancelOrder(order.id, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
