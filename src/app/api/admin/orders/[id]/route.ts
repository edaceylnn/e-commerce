import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelOrder } from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, canTransitionStatus } from "@/lib/order-status";
import type { Prisma } from "@/generated/prisma/client";

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().optional(),
  internalNote: z.string().trim().optional(),
  // The order's updatedAt the admin loaded the page with — lets us detect
  // "someone else changed this order since you opened it" instead of
  // silently overwriting a concurrent edit (Bölüm 17 edge case).
  expectedUpdatedAt: z.string().trim().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } }).catch(() => null);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (
    parsed.data.expectedUpdatedAt &&
    parsed.data.expectedUpdatedAt !== order.updatedAt.toISOString()
  ) {
    return NextResponse.json(
      { error: "Bu sipariş başka bir işlem tarafından güncellendi — sayfayı yenileyin." },
      { status: 409 }
    );
  }

  if (
    parsed.data.status !== order.status &&
    !canTransitionStatus(order.status, parsed.data.status)
  ) {
    return NextResponse.json(
      {
        error: `${ORDER_STATUS_LABELS[order.status]} durumundan ${ORDER_STATUS_LABELS[parsed.data.status]} durumuna doğrudan geçilemez.`,
      },
      { status: 409 }
    );
  }

  // Cancelling goes through the shared helper so admin-initiated and
  // customer-initiated cancellation always behave the same way — flip to
  // IPTAL and give back any stock that was actually decremented at payment
  // confirmation (see src/lib/orders.ts).
  if (parsed.data.status === "IPTAL") {
    if (order.status !== "IPTAL") {
      const result = await cancelOrder(order.id, session.userId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
    }
  } else if (parsed.data.status !== order.status) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: parsed.data.status } });
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: "STATUS_CHANGE",
          message: `Durum "${ORDER_STATUS_LABELS[order.status]}" → "${ORDER_STATUS_LABELS[parsed.data.status]}" olarak güncellendi.`,
          actorUserId: session.userId,
        },
      });
    });
  }

  // A bare { status } call (e.g. a quick "cancel order" action) must not
  // wipe out an already-saved tracking number/note — only touch these
  // fields when the caller actually included the key, distinguishing
  // "not sent" from "sent as an empty string to clear it". Only log/write
  // when the value actually changed, so re-saving an unrelated field
  // doesn't spam the timeline.
  const rawBody = body as Record<string, unknown>;
  const extra: Prisma.OrderUpdateInput = {};
  let trackingChanged = false;
  let noteChanged = false;
  if ("trackingNumber" in rawBody && (parsed.data.trackingNumber || "") !== (order.trackingNumber ?? "")) {
    extra.trackingNumber = parsed.data.trackingNumber || null;
    trackingChanged = true;
  }
  if ("internalNote" in rawBody && (parsed.data.internalNote || "") !== (order.internalNote ?? "")) {
    extra.internalNote = parsed.data.internalNote || null;
    noteChanged = true;
  }
  if (Object.keys(extra).length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: extra });
      if (trackingChanged) {
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "TRACKING",
            message: extra.trackingNumber
              ? `Kargo takip no eklendi: ${extra.trackingNumber}`
              : "Kargo takip no kaldırıldı.",
            actorUserId: session.userId,
          },
        });
      }
      if (noteChanged) {
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "NOTE",
            message: "İç not güncellendi.",
            actorUserId: session.userId,
          },
        });
      }
    });
  }

  return NextResponse.json({ ok: true });
}
