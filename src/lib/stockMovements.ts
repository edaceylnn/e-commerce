export const STOCK_MOVEMENT_TYPE_LABELS: Record<string, string> = {
  RECEIVING: "Mal Kabul",
  SALE: "Satış",
  CANCELLATION: "İptal",
  RETURN: "İade",
  DAMAGE: "Hasarlı Ürün",
  MANUAL_ADJUSTMENT: "Manuel Düzeltme",
};

// Only these are legitimately admin-initiated from the manual movement
// modal — SALE/RETURN/CANCELLATION are always written by the checkout,
// refund and cancel flows themselves (see src/lib/orders.ts, checkout
// callback route) and would misrepresent their origin if picked by hand.
export const MANUAL_STOCK_MOVEMENT_TYPES = ["RECEIVING", "DAMAGE", "MANUAL_ADJUSTMENT"] as const;
