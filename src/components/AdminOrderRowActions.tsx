"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isOrderCancelable, isOrderRefundable } from "@/lib/order-status";

export function AdminOrderRowActions({
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
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const cancellable = isOrderCancelable(status);
  const refundable = isOrderRefundable(status, paidAt, refundedAt);

  async function handleCancel() {
    setOpen(false);
    if (!window.confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IPTAL" }),
    });
    router.refresh();
  }

  async function handleRefund() {
    setOpen(false);
    if (
      !window.confirm(
        "Bu sipariş için iyzico üzerinden gerçek bir para iadesi başlatılacak. Emin misiniz?"
      )
    )
      return;
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "İade edilemedi.");
    }
    router.refresh();
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="İşlemler"
        className="rounded-md p-1.5 text-adm-text-tertiary transition hover:bg-adm-surface-secondary hover:text-adm-text"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <>
          <button
            aria-label="Kapat"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-44 border border-adm-border bg-adm-surface-card py-1">
            <Link
              href={`/admin/orders/${orderId}`}
              className="block px-3.5 py-2 text-sm text-adm-text transition hover:bg-adm-surface-secondary"
            >
              Detayı Gör
            </Link>
            {refundable && (
              <button
                onClick={handleRefund}
                className="block w-full px-3.5 py-2 text-left text-sm text-adm-danger transition hover:bg-adm-danger-soft"
              >
                İade Et
              </button>
            )}
            {cancellable && (
              <button
                onClick={handleCancel}
                className="block w-full px-3.5 py-2 text-left text-sm text-adm-danger transition hover:bg-adm-danger-soft"
              >
                Siparişi İptal Et
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
