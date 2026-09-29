import type { ShipmentStatus } from "@/generated/prisma/client";
import { carrierName, SHIPMENT_STATUS_LABELS, trackingUrl } from "@/lib/shipping/carriers";

// What the customer-facing order pages show about delivery: the order's
// latest shipment, ready to render (no carrier logic in components).
export type ShipmentSummary = {
  carrierName: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: ShipmentStatus;
  statusLabel: string;
  deliveredAt: Date | null;
  events: { id: string; label: string; description: string; location: string | null; occurredAt: Date }[];
};

// Prisma include for summarizeShipment's input, newest shipment first.
export const SHIPMENTS_INCLUDE = {
  orderBy: { createdAt: "desc" as const },
  include: { events: { orderBy: { occurredAt: "desc" as const } } },
};

type ShipmentRow = {
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  deliveredAt: Date | null;
  events: { id: string; status: ShipmentStatus; description: string; location: string | null; occurredAt: Date }[];
};

export function summarizeShipment(shipments: ShipmentRow[]): ShipmentSummary | null {
  const latest = shipments[0];
  if (!latest) return null;
  return {
    carrierName: carrierName(latest.carrier),
    trackingNumber: latest.trackingNumber,
    trackingUrl: trackingUrl(latest.carrier, latest.trackingNumber),
    status: latest.status,
    statusLabel: SHIPMENT_STATUS_LABELS[latest.status],
    deliveredAt: latest.deliveredAt,
    events: latest.events.map((e) => ({
      id: e.id,
      label: SHIPMENT_STATUS_LABELS[e.status],
      description: e.description,
      location: e.location,
      occurredAt: e.occurredAt,
    })),
  };
}
