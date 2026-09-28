import { ORDER_STATUS_LABELS } from "@/lib/order-status";

// Design handoff → Account: status is typography only (no pills or dots);
// closed-out states (returned, cancelled) drop to text-4.
const MUTED = new Set(["IADE", "IPTAL"]);

export function OrderStatusText({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`text-card font-medium ${MUTED.has(status) ? "text-text-4" : "text-ink"} ${className}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
