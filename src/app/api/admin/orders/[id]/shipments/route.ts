import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { afterOrderStatusChange } from "@/lib/order-lifecycle";
import { CARRIERS, getCarrier } from "@/lib/shipping/carriers";
import { recordShipmentScan } from "@/lib/shipping/events";
import { simulatorTrackingNumber } from "@/lib/shipping/simulator";

const bodySchema = z.object({
  carrier: z.enum(CARRIERS.map((c) => c.code) as [string, ...string[]]),
  trackingNumber: z.string().trim().max(64).optional(),
});

// "Kargoya Ver". A manual carrier's parcel is handed over right now, so it
// starts as PICKED_UP (order → Kargoya Verildi). An integrated carrier
// issues the number and reports the pickup itself by webhook, so its
// shipment starts as CREATED and the order waits for that scan.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const carrier = getCarrier(parsed.data.carrier)!;

  const trackingNumber = carrier.integrated ? simulatorTrackingNumber() : parsed.data.trackingNumber;
  if (!trackingNumber) {
    return NextResponse.json({ error: "Takip numarasını girin." }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  if (order.status !== "HAZIRLANIYOR") {
    return NextResponse.json({ error: "Yalnızca hazırlanan siparişler kargoya verilebilir." }, { status: 409 });
  }

  try {
    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: { orderId: order.id, carrier: carrier.code, trackingNumber },
      });
      const scan = await recordShipmentScan(
        tx,
        created.id,
        carrier.integrated
          ? { externalId: "created", status: "CREATED", description: "Kargo kaydı oluşturuldu", occurredAt: new Date() }
          : { externalId: "handed-over", status: "PICKED_UP", description: `${carrier.name}'ya teslim edildi`, occurredAt: new Date() },
        session.userId
      );
      return { created, orderStatus: scan.recorded ? scan.orderStatus : null };
    });
    await afterOrderStatusChange(order.id, shipment.orderStatus, session.userId);
    return NextResponse.json({ id: shipment.created.id, trackingNumber });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu takip numarası bu firmada zaten kayıtlı." }, { status: 409 });
    }
    throw err;
  }
}
