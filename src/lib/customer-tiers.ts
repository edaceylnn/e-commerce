// A customer counts as "VIP" once their lifetime paid spend crosses a
// threshold — a real, deterministic business rule computed from actual
// order data (not a fabricated loyalty-points system). The threshold is
// admin-configurable (Bölüm 40 — Ayarlar → getSettings().vipSpendThreshold);
// this constant is only the schema/UI fallback shown before that row loads.
export const VIP_SPEND_THRESHOLD_DEFAULT = 5000;

export function isVipCustomer(role: string, totalSpent: number, threshold: number): boolean {
  return role === "CUSTOMER" && totalSpent >= threshold;
}
