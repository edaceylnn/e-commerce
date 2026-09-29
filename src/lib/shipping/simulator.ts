import { randomInt } from "crypto";
import type { ShipmentStatus } from "@/generated/prisma/client";
import { SIGNATURE_HEADER, signWebhookBody, type WebhookScan } from "@/lib/shipping/webhook";

// "EDACEY Test Kargo": a stand-in for an API-integrated carrier. It issues
// tracking numbers and reports each scan the way a real carrier would — as
// a signed HTTP webhook to /api/shipping/webhook/simulator — so the whole
// receive → verify → dedupe → update path runs for real.

export function simulatorTrackingNumber() {
  return `EDT${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
}

const NEXT: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  CREATED: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERY_FAILED: "OUT_FOR_DELIVERY",
};

export function nextSimulatedStatus(current: ShipmentStatus) {
  return NEXT[current] ?? null;
}

export function simulatedScan(
  trackingNumber: string,
  status: ShipmentStatus,
  destinationCity: string,
  occurredAt = new Date()
): WebhookScan {
  const detail: Record<ShipmentStatus, [string, string]> = {
    CREATED: ["Kargo kaydı oluşturuldu", "İstanbul"],
    PICKED_UP: ["Gönderi şubeden teslim alındı", "İstanbul / Kadıköy Şube"],
    IN_TRANSIT: ["Transfer merkezine ulaştı", "İstanbul Anadolu Aktarma"],
    OUT_FOR_DELIVERY: ["Dağıtıma çıktı", `${destinationCity} Şube`],
    DELIVERY_FAILED: ["Alıcı adreste bulunamadı", `${destinationCity} Şube`],
    DELIVERED: ["Alıcıya teslim edildi", destinationCity],
  };
  const [description, location] = detail[status];
  return {
    // Unique per scan (a parcel can go out for delivery twice). A retry of
    // this same notification carries the same id — the store ignores it.
    eventId: `${trackingNumber}-${status}-${occurredAt.getTime()}`,
    trackingNumber,
    status,
    description,
    location,
    occurredAt: occurredAt.toISOString(),
  };
}

// Posts a scan to the store's webhook exactly like the carrier would.
export async function sendSimulatedScan(origin: string, scan: WebhookScan) {
  const body = JSON.stringify(scan);
  const res = await fetch(`${origin}/api/shipping/webhook/simulator`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: signWebhookBody(body) },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
}
