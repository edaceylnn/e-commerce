import type { OrderStatus, Prisma, ShipmentStatus } from "@/generated/prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { SHIPMENT_STATUS_LABELS } from "@/lib/shipping/carriers";

// How far along a parcel is. DELIVERY_FAILED shares OUT_FOR_DELIVERY's
// step: the courier tried, and will usually try again.
const STEP: Record<ShipmentStatus, number> = {
  CREATED: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERY_FAILED: 3,
  DELIVERED: 4,
};

// A shipment's status, derived from all of its scans rather than from
// whichever webhook arrived last: carriers retry and reorder deliveries, so
// a late "in transit" must not undo "out for delivery". The newest scan
// wins; DELIVERED is final once seen.
export function currentShipmentStatus(events: { status: ShipmentStatus; occurredAt: Date }[]): ShipmentStatus {
  if (events.some((e) => e.status === "DELIVERED")) return "DELIVERED";
  const latest = [...events].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || STEP[b.status] - STEP[a.status]
  )[0];
  return latest?.status ?? "CREATED";
}

// What the order should become because of its shipment, or null to leave
// it alone. Only moves forward, and never touches a cancelled/refunded or
// not-yet-paid order.
export function orderStatusForShipment(shipment: ShipmentStatus, order: OrderStatus): OrderStatus | null {
  if (shipment === "DELIVERED" && (order === "HAZIRLANIYOR" || order === "KARGOLANDI")) return "TESLIM_EDILDI";
  if (STEP[shipment] >= STEP.PICKED_UP && order === "HAZIRLANIYOR") return "KARGOLANDI";
  return null;
}

export type ShipmentScan = {
  // The carrier's id for this scan — the idempotency key.
  externalId: string;
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  occurredAt: Date;
};

export type RecordResult =
  | { recorded: false }
  | { recorded: true; shipmentStatus: ShipmentStatus; orderStatus: OrderStatus | null };

// Records one scan and brings the shipment and order status in line. Safe
// to call again with the same scan (ignored) and concurrently for the same
// shipment (serialised by a row lock). Run inside a transaction.
export async function recordShipmentScan(
  tx: Prisma.TransactionClient,
  shipmentId: string,
  scan: ShipmentScan,
  actorUserId?: string
): Promise<RecordResult> {
  // Two scans for one parcel at once would each recompute the status from
  // a view missing the other's row; the lock makes them take turns.
  await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;

  const inserted = await tx.shipmentEvent.createMany({
    data: [{ shipmentId, ...scan, location: scan.location ?? null }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return { recorded: false };

  const shipment = await tx.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: { events: { select: { status: true, occurredAt: true } }, order: { select: { id: true, status: true } } },
  });
  const status = currentShipmentStatus(shipment.events);
  await tx.shipment.update({
    where: { id: shipmentId },
    data: {
      status,
      deliveredAt: status === "DELIVERED" ? (shipment.deliveredAt ?? scan.occurredAt) : null,
    },
  });

  const next = orderStatusForShipment(status, shipment.order.status);
  if (next) {
    await tx.order.update({ where: { id: shipment.order.id }, data: { status: next } });
    await tx.orderEvent.create({
      data: {
        orderId: shipment.order.id,
        type: "STATUS_CHANGE",
        message: `Kargo: ${SHIPMENT_STATUS_LABELS[status]} — sipariş "${ORDER_STATUS_LABELS[next]}" oldu.`,
        actorUserId,
      },
    });
  }
  return { recorded: true, shipmentStatus: status, orderStatus: next };
}
