"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/format";

export type AdminInvoice = {
  id: string;
  type: "SALE" | "RETURN";
  status: "ISSUED" | "CANCELLED";
  number: string;
  issuedAt: string;
  grandTotal: number;
  cancelReason: string | null;
  // False for a sale invoice that has returns issued against it.
  cancellable: boolean;
};

// The order page's "Fatura" card. The sale invoice is issued automatically
// when the order ships and return documents after refunds; the buttons here
// are for issuing early, catching up after a failure, and cancelling a
// mistake. Issued invoices are never edited.
export function AdminInvoicePanel({
  orderId,
  invoices,
  canIssueSale,
  canIssueReturn,
}: {
  orderId: string;
  invoices: AdminInvoice[];
  canIssueSale: boolean;
  canIssueReturn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function call(url: string, method: "POST" | "PATCH", body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "İşlem başarısız.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleCancel(e: FormEvent) {
    e.preventDefault();
    if (!cancelling) return;
    if (await call(`/api/admin/invoices/${cancelling}`, "PATCH", { action: "cancel", reason })) {
      setCancelling(null);
      setReason("");
    }
  }

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <p className="text-sm text-adm-text-secondary">
          Henüz fatura yok. Sipariş kargoya verilince otomatik kesilir.
        </p>
      ) : (
        <ul className="divide-y divide-adm-border">
          {invoices.map((inv) => (
            <li key={inv.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`/fatura/${inv.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-adm-text hover:underline"
                  >
                    {inv.number}
                  </a>
                  <p className="text-xs text-adm-text-tertiary">
                    {inv.type === "SALE" ? "Satış" : "İade"} ·{" "}
                    {new Date(inv.issuedAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} ·{" "}
                    {formatPrice(inv.grandTotal)}
                  </p>
                  {inv.cancelReason && <p className="text-xs text-adm-text-tertiary">İptal nedeni: {inv.cancelReason}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge size="sm" variant={inv.status === "CANCELLED" ? "danger" : inv.type === "RETURN" ? "warning" : "success"}>
                    {inv.status === "CANCELLED" ? "İptal" : "Kesildi"}
                  </StatusBadge>
                  {inv.cancellable && cancelling !== inv.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelling(inv.id);
                        setError(null);
                      }}
                      className="text-xs font-medium text-adm-danger hover:underline"
                    >
                      İptal et
                    </button>
                  )}
                </div>
              </div>
              {cancelling === inv.id && (
                <form onSubmit={handleCancel} className="mt-2 space-y-2">
                  <input
                    autoFocus
                    required
                    minLength={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="İptal nedeni (ör. yanlış adres)"
                    className="w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-danger"
                  />
                  <div className="flex gap-2">
                    <AdminButton type="submit" size="sm" variant="danger" loading={busy}>
                      Faturayı iptal et
                    </AdminButton>
                    <AdminButton type="button" size="sm" variant="ghost" onClick={() => setCancelling(null)}>
                      Vazgeç
                    </AdminButton>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {(canIssueSale || canIssueReturn) && (
        <div className="flex flex-wrap gap-2">
          {canIssueSale && (
            <AdminButton size="sm" variant="secondary" loading={busy} onClick={() => call(`/api/admin/orders/${orderId}/invoices`, "POST", { type: "SALE" })}>
              Fatura kes
            </AdminButton>
          )}
          {canIssueReturn && (
            <AdminButton size="sm" variant="secondary" loading={busy} onClick={() => call(`/api/admin/orders/${orderId}/invoices`, "POST", { type: "RETURN" })}>
              İade faturası kes
            </AdminButton>
          )}
        </div>
      )}
      {error && <p className="text-xs text-adm-danger">{error}</p>}
    </div>
  );
}
