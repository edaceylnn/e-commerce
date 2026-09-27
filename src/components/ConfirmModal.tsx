"use client";

import { useEffect } from "react";

// Replaces window.confirm for destructive actions (address delete, etc.) —
// same semantics, but styled and dismissible via Escape/backdrop click.
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger = false,
  submitting = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-sm border border-line bg-background p-6"
      >
        <h2 id="confirm-modal-title" className="font-display text-xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-background transition disabled:opacity-50 ${
              danger ? "bg-danger hover:brightness-95" : "bg-primary hover:bg-primary-dark hover:text-accent-ink"
            }`}
          >
            {submitting ? "İşleniyor…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
