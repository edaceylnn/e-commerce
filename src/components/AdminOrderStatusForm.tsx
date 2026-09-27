"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/Button";
import { ORDER_STATUS_LABELS, nextAllowedStatuses } from "@/lib/order-status";

export function AdminOrderStatusForm({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentInternalNote,
  currentUpdatedAt,
}: {
  orderId: string;
  currentStatus: string;
  currentTrackingNumber: string | null;
  currentInternalNote: string | null;
  currentUpdatedAt: string;
}) {
  // The dropdown only ever offers the order's current status plus its valid
  // next steps (Bölüm 17's state machine) — never an arbitrary jump/rollback.
  const selectableStatuses = [currentStatus, ...nextAllowedStatuses(currentStatus)];
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [internalNote, setInternalNote] = useState(currentInternalNote ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    status !== currentStatus ||
    trackingNumber !== (currentTrackingNumber ?? "") ||
    internalNote !== (currentInternalNote ?? "");

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber, internalNote, expectedUpdatedAt: currentUpdatedAt }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
        >
          {selectableStatuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          placeholder="Kargo takip no (opsiyonel)"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
        />
      </div>
      <textarea
        placeholder="İç not (sadece admin görür, opsiyonel)"
        rows={2}
        value={internalNote}
        onChange={(e) => setInternalNote(e.target.value)}
        className="w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
      />
      <div className="flex items-center gap-3">
        <AdminButton onClick={handleSave} disabled={submitting || !dirty}>
          {submitting ? "Kaydediliyor…" : "Kaydet"}
        </AdminButton>
        {error && <p className="text-xs text-adm-danger">{error}</p>}
      </div>
    </div>
  );
}
