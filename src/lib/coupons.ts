// Pure math, no DB access — safe to import from both the checkout API route
// (authoritative) and the review page (preview display), same reasoning as
// src/lib/shipping.ts.
export function computeCouponDiscount(
  coupon: { type: "PERCENTAGE" | "FIXED"; value: number },
  subtotal: number
): number {
  if (coupon.type === "PERCENTAGE") {
    return subtotal * (coupon.value / 100);
  }
  return Math.min(coupon.value, subtotal);
}
