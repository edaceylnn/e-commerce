"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/Button";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { isOrderCancelable, isOrderRefundable } from "@/lib/order-status";
import { REFUND_REASONS } from "@/lib/refund-reasons";

export function AdminOrderHeaderActions({
  orderId,
  status,
  paidAt,
  refundedAt,
}: {
  orderId: string;
  status: string;
  paidAt: Date | null;
  refundedAt: Date | null;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const cancellable = isOrderCancelable(status);
  const refundable = isOrderRefundable(status, paidAt, refundedAt);

  async function handleCancel() {
    if (!window.confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
    setCancelling(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IPTAL" }),
    });
    setCancelling(false);
    router.refresh();
  }

  async function handleRefund() {
    if (
      !window.confirm(
        "Bu sipariş için iyzico üzerinden gerçek bir para iadesi başlatılacak. Emin misiniz?"
      )
    )
      return;
    setRefunding(true);
    setRefundError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: refundReason || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setRefunding(false);
    if (!res.ok) {
      setRefundError(data.error ?? "İade edilemedi.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton variant="secondary" size="sm" onClick={() => window.print()}>
          Yazdır
        </AdminButton>
        {refundable && (
          <>
            <FilterSelect
              uiSize="sm"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              aria-label="İade sebebi"
            >
              <option value="">Sebep (opsiyonel)</option>
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </FilterSelect>
            <AdminButton variant="danger" size="sm" onClick={handleRefund} loading={refunding}>
              İade Et
            </AdminButton>
          </>
        )}
        {cancellable && (
          <AdminButton variant="danger" size="sm" onClick={handleCancel} loading={cancelling}>
            Siparişi İptal Et
          </AdminButton>
        )}
      </div>
      {refundError && <p className="text-xs text-adm-danger">{refundError}</p>}
    </div>
  );
}
