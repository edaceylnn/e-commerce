import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCarrier } from "@/lib/shipping/carriers";
import { recordShipmentScan } from "@/lib/shipping/events";
import { SIGNATURE_HEADER, verifyWebhookSignature, WebhookScanSchema } from "@/lib/shipping/webhook";

// Scan notifications from an integrated carrier (today: the simulator).
// Response codes follow what carriers expect: 2xx means "stop retrying",
// anything else means "send it again later".
export async function POST(request: NextRequest, { params }: { params: Promise<{ carrier: string }> }) {
  const { carrier } = await params;
  if (!getCarrier(carrier)?.integrated) {
    return NextResponse.json({ error: "Unknown carrier." }, { status: 404 });
  }

  const body = await request.text();
  if (!verifyWebhookSignature(body, request.headers.get(SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = WebhookScanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const scan = parsed.data;

  const shipment = await prisma.shipment.findUnique({
    where: { carrier_trackingNumber: { carrier, trackingNumber: scan.trackingNumber } },
    select: { id: true },
  });
  // Not ours (or deleted): acknowledge so the carrier doesn't retry forever.
  if (!shipment) {
    console.warn("shipping webhook for unknown tracking number", { carrier, trackingNumber: scan.trackingNumber });
    return NextResponse.json({ ignored: true }, { status: 202 });
  }

  const result = await prisma.$transaction((tx) =>
    recordShipmentScan(tx, shipment.id, {
      externalId: scan.eventId,
      status: scan.status,
      description: scan.description,
      location: scan.location,
      occurredAt: new Date(scan.occurredAt),
    })
  );
  return NextResponse.json(result);
}
