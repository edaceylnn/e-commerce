import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { StatusBadge, StatusBadgeSize, StatusBadgeVariant } from "@/components/admin/StatusBadge";

const STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  PENDING_PAYMENT: "neutral",
  HAZIRLANIYOR: "info",
  KARGOLANDI: "purple",
  TESLIM_EDILDI: "success",
  IPTAL: "danger",
  IADE: "warning",
};

export function OrderStatusBadge({ status, size }: { status: string; size?: StatusBadgeSize }) {
  return (
    <StatusBadge variant={STATUS_VARIANTS[status] ?? "neutral"} size={size}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}
