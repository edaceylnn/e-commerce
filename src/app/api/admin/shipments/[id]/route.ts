import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { afterOrderStatusChange } from "@/lib/order-lifecycle";
import { getCarrier } from "@/lib/shipping/carriers";
import { recordShipmentScan } from "@/lib/shipping/events";
import { nextSimulatedStatus, sendSimulatedScan, simulatedScan } from "@/lib/shipping/simulator";

const bodySchema = z.object({ action: z.enum(["mark-delivered", "simulate-next"]) });

// mark-delivered: a manual carrier never reports delivery, so the admin
//   records it (once).
// simulate-next: asks the simulator to send the parcel's next scan — over
//   real HTTP to our own webhook, like a carrier would.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: { order: { select: { shippingAddress: { select: { city: true } } } } },
  });
  if (!shipment) return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
  const integrated = getCarrier(shipment.carrier)?.integrated ?? false;

  if (parsed.data.action === "mark-delivered") {
    if (integrated) {
      return NextResponse.json({ error: "Bu firmanın teslimatı kargo firmasından gelir." }, { status: 409 });
    }
    const result = await prisma.$transaction((tx) =>
      recordShipmentScan(
        tx,
        shipment.id,
        { externalId: "admin-delivered", status: "DELIVERED", description: "Teslim edildi (admin işaretledi)", occurredAt: new Date() },
        session.userId
      )
    );
    if (result.recorded) await afterOrderStatusChange(shipment.orderId, result.orderStatus, session.userId);
    return NextResponse.json(result);
  }

  if (!integrated) {
    return NextResponse.json({ error: "Yalnızca simülatör gönderileri ilerletilebilir." }, { status: 409 });
  }
  const next = nextSimulatedStatus(shipment.status);
  if (!next) return NextResponse.json({ error: "Gönderi zaten teslim edildi." }, { status: 409 });

  const scan = simulatedScan(shipment.trackingNumber, next, shipment.order.shippingAddress.city);
  const sent = await sendSimulatedScan(request.nextUrl.origin, scan).catch((err) => {
    console.error("simulator webhook failed", err);
    return null;
  });
  if (!sent?.ok) {
    return NextResponse.json({ error: "Simülatör bildirimi gönderilemedi." }, { status: 502 });
  }
  return NextResponse.json(sent.body);
}
