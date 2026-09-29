import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Carrier → store scan notifications. The body is signed with a shared
// secret (HMAC-SHA256, hex, in the x-shipping-signature header) so nobody
// but the carrier can move an order to "delivered".

export const SIGNATURE_HEADER = "x-shipping-signature";

// Development falls back to a fixed secret so the simulator works out of
// the box; production must set SHIPPING_WEBHOOK_SECRET.
function secret() {
  const value = process.env.SHIPPING_WEBHOOK_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "dev-shipping-webhook-secret";
  throw new Error("SHIPPING_WEBHOOK_SECRET is not set");
}

export function signWebhookBody(body: string) {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

// Checks against the exact bytes received — re-serialising the parsed JSON
// could reorder keys and break a valid signature.
export function verifyWebhookSignature(body: string, signature: string | null) {
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signWebhookBody(body), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export const WebhookScanSchema = z.object({
  eventId: z.string().min(1),
  trackingNumber: z.string().min(1),
  status: z.enum(["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERY_FAILED", "DELIVERED"]),
  description: z.string().min(1),
  location: z.string().nullish(),
  occurredAt: z.iso.datetime(),
});

export type WebhookScan = z.infer<typeof WebhookScanSchema>;
