"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminButton } from "@/components/admin/Button";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { REFUND_REASONS } from "@/lib/refund-reasons";

type ItemRow = {
  id: string;
  productId: number;
  title: string;
  thumbnail: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  refundedAt: Date | null;
};

export function AdminOrderItemsPanel({
  orderId,
  items,
  refundable,
}: {
  orderId: string;
  items: ItemRow[];
  refundable: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePartialRefund() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `${selected.size} ürün için iyzico üzerinden gerçek bir kısmi para iadesi başlatılacak. Emin misiniz?`
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemIds: Array.from(selected), reason: reason || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "İade edilemedi.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      <ul className="divide-y divide-adm-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            {refundable && !item.refundedAt && (
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="accent-adm-primary"
                aria-label={`${item.title} seç`}
              />
            )}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-adm-surface-secondary">
              <Image src={item.thumbnail} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-adm-text">
                {item.title}
                {item.refundedAt && <StatusBadge variant="danger">İade Edildi</StatusBadge>}
              </p>
              {item.sku && <p className="text-xs text-adm-text-tertiary">SKU: {item.sku}</p>}
              <p className="text-xs text-adm-text-tertiary">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-adm-text">
              {formatPrice(item.unitPrice * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {refundable && (
        <div className="mt-4 flex items-center gap-3">
          <FilterSelect uiSize="sm" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="İade sebebi">
            <option value="">Sebep (opsiyonel)</option>
            {REFUND_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </FilterSelect>
          <AdminButton
            variant="danger"
            size="sm"
            onClick={handlePartialRefund}
            disabled={selected.size === 0}
            loading={submitting}
          >
            {`Seçilenleri İade Et (${selected.size})`}
          </AdminButton>
          {error && <p className="text-xs text-adm-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
