// Shared refund-reason options — captured optionally by the admin at
// refund time (src/components/AdminOrderItemsPanel.tsx /
// AdminOrderHeaderActions.tsx) and used to group the İadeler reporting page
// (src/app/admin/(dashboard)/returns/page.tsx). Free text isn't stored —
// a fixed list keeps the breakdown chart meaningful.
export const REFUND_REASONS = [
  "Beden uymadı",
  "Ürün hasarlı",
  "Beğenmedim",
  "Yanlış ürün geldi",
  "Geç teslimat",
  "Diğer",
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

export function isRefundReason(value: string): value is RefundReason {
  return (REFUND_REASONS as readonly string[]).includes(value);
}
