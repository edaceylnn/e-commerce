import { ORDER_STATUS_LABELS } from "@/lib/order-status";

// Storefront order status: a small colored dot + the label in ink. The admin
// panel keeps its own tinted OrderStatusBadge; this one uses the storefront
// palette and never relies on color alone (the label always reads it out).
const DOT: Record<string, string> = {
  PENDING_PAYMENT: "bg-warning",
  HAZIRLANIYOR: "bg-info",
  KARGOLANDI: "bg-info",
  TESLIM_EDILDI: "bg-success",
  IPTAL: "bg-danger",
  IADE: "bg-ink-soft",
};

export function OrderStatusText({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${className}`}>
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${DOT[status] ?? "bg-ink-soft"}`} />
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
