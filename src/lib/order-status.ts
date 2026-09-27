// Hand-settable via the admin status dropdown (AdminOrderStatusForm) and
// the PATCH /api/admin/orders/[id] route's zod schema. IADE is deliberately
// excluded — see ALL_ORDER_STATUSES below.
export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "HAZIRLANIYOR",
  "KARGOLANDI",
  "TESLIM_EDILDI",
  "IPTAL",
] as const;

// Every status an order can actually reach, including IADE — for
// filtering and display only (e.g. the orders list's saved-view tabs).
export const ALL_ORDER_STATUSES = [...ORDER_STATUSES, "IADE"] as const;

// IADE is deliberately absent from ORDER_STATUSES above (the manual admin
// status dropdown) — it's only reachable through the refund action (see
// src/lib/orders.ts refundOrder), never hand-set. It still needs a label
// here for display (badges, filters) once an order reaches it.
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme Bekleniyor",
  HAZIRLANIYOR: "Hazırlanıyor",
  KARGOLANDI: "Kargoya Verildi",
  TESLIM_EDILDI: "Teslim Edildi",
  IPTAL: "İptal Edildi",
  IADE: "İade Edildi",
};

// These pure status predicates live here rather than in src/lib/orders.ts
// on purpose: that module imports @/lib/db (Prisma) at the top level, and
// any client component importing from it — even just a status check —
// drags that whole module graph (down to the `pg` driver) into the browser
// bundle and breaks the build. src/lib/orders.ts re-uses these same
// functions for its server-side logic instead of redefining them.

// Shipped/delivered/already-cancelled orders can't be cancelled through
// this path — matches the promise on /yardim/kargo-ve-teslimat.
const CANCELABLE_STATUSES = ["PENDING_PAYMENT", "HAZIRLANIYOR"] as const;

export function isOrderCancelable(status: string): boolean {
  return (CANCELABLE_STATUSES as readonly string[]).includes(status);
}

// A paid order can be refunded once it's either already cancelled (IPTAL —
// e.g. the customer's own self-cancel, which never touches iyzico, see
// CancelOrderButton's copy) or has shipped/been delivered and is now coming
// back as a return. A still-in-progress paid order (HAZIRLANIYOR) isn't
// refundable directly — cancel it first, which flips it to IPTAL.
export const REFUNDABLE_STATUSES = ["IPTAL", "KARGOLANDI", "TESLIM_EDILDI"] as const;

export function isOrderRefundable(
  status: string,
  paidAt: Date | null,
  refundedAt: Date | null
): boolean {
  return (
    !!paidAt &&
    !refundedAt &&
    (REFUNDABLE_STATUSES as readonly string[]).includes(status)
  );
}

// Statuses where a refund also means the goods are physically coming back,
// so stock has to be restored — unlike IPTAL, where cancelOrder already
// restored it. Only used server-side (src/lib/orders.ts refundOrder).
export const RETURN_STATUSES = ["KARGOLANDI", "TESLIM_EDILDI"] as const;

// The order status state machine (Bölüm 17) — which statuses a given status
// can move to via the admin dropdown. Forward-only, one step at a time; a
// shipped/delivered order can no longer be manually flipped backwards or
// cancelled — a return has to go through the refund flow (IADE) instead.
// TESLIM_EDILDI/IPTAL/IADE are terminal for this manual path.
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ["HAZIRLANIYOR", "IPTAL"],
  HAZIRLANIYOR: ["KARGOLANDI", "IPTAL"],
  KARGOLANDI: ["TESLIM_EDILDI"],
  TESLIM_EDILDI: [],
  IPTAL: [],
  IADE: [],
};

export function nextAllowedStatuses(status: string): readonly string[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

// `from === to` is always allowed — that's a no-op status-wise, used when
// the admin is only updating the tracking number or internal note.
export function canTransitionStatus(from: string, to: string): boolean {
  return from === to || nextAllowedStatuses(from).includes(to);
}

// No separate PaymentStatus enum exists — payment state is derived from
// `paidAt` (never charged vs. charged), same signal /api/checkout/create
// itself relies on.
export function paymentStatusLabel(paidAt: Date | null, status: string): string {
  if (status === "IADE") return "İade Edildi";
  if (status === "IPTAL") return "İptal Edildi";
  return paidAt ? "Ödendi" : "Ödeme Bekleniyor";
}
