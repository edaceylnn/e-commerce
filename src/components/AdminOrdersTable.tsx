"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, getInitials } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminOrderRowActions } from "@/components/AdminOrderRowActions";

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  thumbnails: { id: string; url: string; title: string }[];
  extraItemCount: number;
  createdAtLabel: string;
  paidAt: Date | null;
  status: string;
  refundedAt: Date | null;
  total: number;
};

export function AdminOrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const eligibleForShip = orders.filter(
    (o) => selected.has(o.id) && o.status === "HAZIRLANIYOR"
  ).length;

  function toggleAll() {
    setSelected((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkShip() {
    if (
      !window.confirm(
        `${selected.size} sipariş "Kargoya Verildi" olarak işaretlenecek — sadece "Hazırlanıyor" durumundakiler güncellenir. Devam edilsin mi?`
      )
    )
      return;
    setBulkSubmitting(true);
    setBulkResult(null);
    const res = await fetch("/api/admin/orders/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: Array.from(selected), status: "KARGOLANDI" }),
    });
    const data = await res.json();
    setBulkSubmitting(false);
    if (!res.ok) {
      setBulkResult(data.error ?? "İşlem başarısız oldu.");
      return;
    }
    setBulkResult(
      `${data.updated} sipariş güncellendi${data.skipped > 0 ? `, ${data.skipped} sipariş uygun olmadığı için atlandı.` : "."}`
    );
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 border border-adm-border bg-adm-surface-secondary px-4 py-2.5 text-sm">
          <span className="font-medium text-adm-text">{selected.size} sipariş seçildi</span>
          <button
            onClick={handleBulkShip}
            disabled={bulkSubmitting || eligibleForShip === 0}
            className="rounded-lg bg-adm-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-adm-primary-deep disabled:opacity-50"
          >
            {bulkSubmitting ? "İşleniyor…" : `Seçilenleri Kargoya Verildi Yap (${eligibleForShip})`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs font-medium text-adm-text-secondary hover:underline"
          >
            Seçimi temizle
          </button>
        </div>
      )}
      {bulkResult && <p className="mb-3 text-xs text-adm-text-secondary">{bulkResult}</p>}

      <div className="overflow-x-auto rounded-xl border border-adm-border bg-adm-surface-card">
        <table className="adm-table min-w-[860px]">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selected.size === orders.length}
                  onChange={toggleAll}
                  className="accent-adm-primary"
                  aria-label="Tümünü seç"
                />
              </th>
              <th>Sipariş</th>
              <th>Müşteri</th>
              <th>Ürünler</th>
              <th>Tarih</th>
              <th>Ödeme</th>
              <th>Durum</th>
              <th className="text-right">Tutar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={selected.has(order.id) ? "bg-adm-primary-soft/50" : undefined}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleOne(order.id)}
                    className="accent-adm-primary"
                    aria-label={`${order.orderNumber} seç`}
                  />
                </td>
                <td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-semibold text-adm-primary hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-adm-primary text-[10px] font-bold text-adm-on-primary">
                      {getInitials(order.customerName)}
                    </span>
                    <span className="text-adm-text">{order.customerName}</span>
                  </div>
                </td>
                <td>
                  <div className="flex -space-x-2">
                    {order.thumbnails.map((item) => (
                      <div
                        key={item.id}
                        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-adm-bg bg-adm-surface-secondary"
                        title={item.title}
                      >
                        <Image src={item.url} alt="" fill sizes="36px" className="object-cover" />
                      </div>
                    ))}
                    {order.extraItemCount > 0 && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-adm-bg bg-adm-surface-secondary text-[11px] font-medium text-adm-text-secondary">
                        +{order.extraItemCount}
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-adm-text-secondary">{order.createdAtLabel}</td>
                <td>
                  <StatusBadge variant={order.paidAt ? "success" : "warning"} size="sm">
                    {order.paidAt ? "Ödendi" : "Bekliyor"}
                  </StatusBadge>
                </td>
                <td>
                  <OrderStatusBadge status={order.status} size="sm" />
                </td>
                <td className="text-right font-semibold text-adm-text">
                  {formatPrice(order.total)}
                </td>
                <td className="text-right">
                  <AdminOrderRowActions
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                  />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="py-14 text-center text-adm-text-secondary">
                  Sipariş bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
