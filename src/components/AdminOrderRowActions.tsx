import Link from "next/link";
import { PencilIcon } from "@/components/icons/AdminIcons";

// One visible icon per row, no "⋯" menu. Cancel and refund are deliberate,
// money-moving actions — they live on the order page, next to the order's
// payment and items, not one misclick away in the list. Orders are never
// deleted (invoices, payments and stock movements point at them).
export function AdminOrderRowActions({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  return (
    <Link
      href={`/admin/orders/${orderId}`}
      aria-label={`${orderNumber} siparişini düzenle`}
      title="Düzenle"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-adm-text-tertiary transition hover:bg-adm-surface-secondary hover:text-adm-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-primary/30"
    >
      <PencilIcon className="h-4 w-4" />
    </Link>
  );
}
