// Shared by the checkout API route (authoritative) and the review page
// (display estimate) so the two never drift. Matches the threshold
// advertised in the marquee banner and documented on
// /yardim/kargo-ve-teslimat.
export const FREE_SHIPPING_THRESHOLD = 1500;
export const FLAT_SHIPPING_COST = 29.9;
// VAT on the shipping fee (a service at the general rate), frozen on each
// order for its invoice.
export const SHIPPING_TAX_RATE = 20;

export function computeShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
}
