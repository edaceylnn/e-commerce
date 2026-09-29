"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/Button";
import { StatusBadge, type StatusBadgeVariant } from "@/components/admin/StatusBadge";
import { CARRIERS, carrierName, getCarrier, SHIPMENT_STATUS_LABELS, trackingUrl } from "@/lib/shipping/carriers";

const fieldClass =
  "w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";
const labelClass = "mb-1.5 block text-[13px] font-medium text-adm-text";

export type AdminShipment = {
  id: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  events: { id: string; status: string; description: string; location: string | null; occurredAt: string }[];
};

function statusVariant(status: string): StatusBadgeVariant {
  if (status === "DELIVERED") return "success";
  if (status === "DELIVERY_FAILED") return "danger";
  if (status === "CREATED") return "neutral";
  return "info";
}

// The order page's "Kargo" card: hand the order to a carrier, then follow
// the parcel. Manual carriers are marked delivered by the admin; the
// simulator's scans arrive through its webhook ("Simülatörde ilerlet").
export function AdminShipmentPanel({
  orderId,
  orderStatus,
  shipment,
}: {
  orderId: string;
  orderStatus: string;
  shipment: AdminShipment | null;
}) {
  const router = useRouter();
  const [carrier, setCarrier] = useState<string>(CARRIERS[0].code);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return;
    }
    router.refresh();
  }

  function handleShip(e: FormEvent) {
    e.preventDefault();
    call(`/api/admin/orders/${orderId}/shipments`, "POST", { carrier, trackingNumber });
  }

  if (!shipment) {
    if (orderStatus !== "HAZIRLANIYOR") {
      return (
        <p className="text-sm text-adm-text-secondary">
          {orderStatus === "PENDING_PAYMENT"
            ? "Ödeme onaylanınca sipariş kargoya verilebilir."
            : "Bu sipariş için kargo kaydı yok."}
        </p>
      );
    }
    const integrated = getCarrier(carrier)?.integrated ?? false;
    return (
      <form onSubmit={handleShip} className="space-y-3">
        <label className="block">
          <span className={labelClass}>Kargo firması</span>
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={fieldClass}>
            {CARRIERS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {integrated ? (
          <p className="text-xs text-adm-text-tertiary">
            Takip numarasını simülatör verir; kargo hareketleri webhook ile gelir.
          </p>
        ) : (
          <label className="block">
            <span className={labelClass}>Takip numarası</span>
            <input
              required
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Kargo firmasının verdiği numara"
              className={fieldClass}
            />
          </label>
        )}
        <div className="flex items-center gap-3">
          <AdminButton type="submit" size="sm" loading={busy}>
            Kargoya Ver
          </AdminButton>
          {error && <p className="text-xs text-adm-danger">{error}</p>}
        </div>
      </form>
    );
  }

  const integrated = getCarrier(shipment.carrier)?.integrated ?? false;
  const url = trackingUrl(shipment.carrier, shipment.trackingNumber);
  const delivered = shipment.status === "DELIVERED";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-adm-text">{carrierName(shipment.carrier)}</p>
          <p className="truncate text-sm text-adm-text-secondary">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {shipment.trackingNumber}
              </a>
            ) : (
              shipment.trackingNumber
            )}
          </p>
        </div>
        <StatusBadge variant={statusVariant(shipment.status)} size="sm">
          {SHIPMENT_STATUS_LABELS[shipment.status]}
        </StatusBadge>
      </div>

      <ol className="space-y-2.5 border-l border-adm-border pl-4">
        {shipment.events.map((event) => (
          <li key={event.id}>
            <p className="text-sm text-adm-text">{event.description}</p>
            <p className="text-xs text-adm-text-tertiary">
              {new Date(event.occurredAt).toLocaleString("tr-TR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </li>
        ))}
      </ol>

      {!delivered && (
        <div className="flex flex-wrap items-center gap-3">
          {integrated ? (
            <AdminButton
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => call(`/api/admin/shipments/${shipment.id}`, "PATCH", { action: "simulate-next" })}
            >
              Simülatörde ilerlet
            </AdminButton>
          ) : (
            <AdminButton
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => call(`/api/admin/shipments/${shipment.id}`, "PATCH", { action: "mark-delivered" })}
            >
              Teslim edildi olarak işaretle
            </AdminButton>
          )}
          {error && <p className="text-xs text-adm-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
