"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Alert } from "@/components/Alert";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/account/orders/${orderNumber}/cancel`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Sipariş iptal edilemedi.");
      setOpen(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-danger/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-label text-danger transition hover:border-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-danger"
      >
        Siparişi İptal Et
      </button>
      {error && (
        <div className="w-full">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <ConfirmModal
        open={open}
        title="Siparişi iptal etmek istediğinize emin misiniz?"
        description="Bu işlem geri alınamaz. Ödemesi alınmış bir siparişse, ödeme iadeniz ekibimiz tarafından ayrıca başlatılacaktır."
        confirmLabel="Siparişi İptal Et"
        danger
        submitting={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
