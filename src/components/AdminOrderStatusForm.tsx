"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/Button";
import { ORDER_STATUS_LABELS, nextAllowedStatuses } from "@/lib/order-status";

const fieldClass =
  "w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

// Two independent cards on the order page share this form: "status" (manual
// status override — shipping itself goes through the Kargo card) and "note"
// (internal note). Each sends only its own fields — the PATCH route
// leaves keys it didn't receive untouched, and the note card re-sends the
// current status, which is always an allowed no-op.
export function AdminOrderStatusForm({
  section,
  orderId,
  currentStatus,
  currentInternalNote,
  currentUpdatedAt,
}: {
  section: "status" | "note";
  orderId: string;
  currentStatus: string;
  currentInternalNote: string | null;
  currentUpdatedAt: string;
}) {
  // The dropdown only ever offers the order's current status plus its valid
  // next steps (Bölüm 17's state machine) — never an arbitrary jump/rollback.
  const selectableStatuses = [currentStatus, ...nextAllowedStatuses(currentStatus)];
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [internalNote, setInternalNote] = useState(currentInternalNote ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    section === "status"
      ? status !== currentStatus
      : internalNote !== (currentInternalNote ?? "");

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const body =
      section === "status"
        ? { status, expectedUpdatedAt: currentUpdatedAt }
        : { status: currentStatus, internalNote, expectedUpdatedAt: currentUpdatedAt };
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    router.refresh();
  }

  const noNextStep = selectableStatuses.length === 1;

  return (
    <div className="space-y-3">
      {section === "status" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-adm-text">Sipariş durumu</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={noNextStep}
              className={`${fieldClass} disabled:opacity-60`}
            >
              {selectableStatuses.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {noNextStep && (
            <p className="text-xs text-adm-text-tertiary">Bu durumdan elle geçilebilecek başka bir durum yok.</p>
          )}
        </>
      ) : (
        <textarea
          aria-label="İç not"
          placeholder="Yalnızca admin görür"
          rows={3}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          className={fieldClass}
        />
      )}
      <div className="flex items-center gap-3">
        <AdminButton size="sm" onClick={handleSave} loading={submitting} disabled={!dirty}>
          Kaydet
        </AdminButton>
        {error && <p className="text-xs text-adm-danger">{error}</p>}
      </div>
    </div>
  );
}
