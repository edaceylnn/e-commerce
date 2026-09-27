import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelOrder } from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, canTransitionStatus } from "@/lib/order-status";

const bulkSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  status: z.enum(ORDER_STATUSES),
});

// Bulk row action from the orders list (Bölüm 16) — e.g. "Seçilenleri
// Kargoya Verildi Yap". Each order still goes through the same state-machine
// check as a single manual update (Bölüm 17); orders that aren't eligible
// are skipped rather than failing the whole batch, and the response says
// exactly how many of each.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: parsed.data.orderIds } },
    select: { id: true, status: true },
  });

  // Already-at-target orders are excluded here too — updating them would be
  // a no-op that still writes a misleading "X → X" timeline event.
  const eligible = orders.filter(
    (o) => o.status !== parsed.data.status && canTransitionStatus(o.status, parsed.data.status)
  );
  const skipped = orders.length - eligible.length;
  let updated = 0;

  if (parsed.data.status === "IPTAL") {
    // Cancelling needs the shared helper's restock handling — never a bare
    // status write — same rule as the single-order PATCH route.
    for (const order of eligible) {
      const result = await cancelOrder(order.id, session.userId);
      if (result.ok) updated += 1;
    }
  } else if (eligible.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const order of eligible) {
        await tx.order.update({ where: { id: order.id }, data: { status: parsed.data.status } });
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "STATUS_CHANGE",
            message: `Durum "${ORDER_STATUS_LABELS[order.status]}" → "${ORDER_STATUS_LABELS[parsed.data.status]}" olarak güncellendi (toplu işlem).`,
            actorUserId: session.userId,
          },
        });
      }
    });
    updated = eligible.length;
  }

  return NextResponse.json({ updated, skipped });
}
