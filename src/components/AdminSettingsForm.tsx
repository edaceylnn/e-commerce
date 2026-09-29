"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSettingsForm({
  initialVipSpendThreshold,
  initialDefaultLowStockThreshold,
}: {
  initialVipSpendThreshold: number;
  initialDefaultLowStockThreshold: number;
}) {
  const router = useRouter();
  const [vipSpendThreshold, setVipSpendThreshold] = useState(String(initialVipSpendThreshold));
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(
    String(initialDefaultLowStockThreshold)
  );
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vipSpendThreshold: Number(vipSpendThreshold),
        defaultLowStockThreshold: Number(defaultLowStockThreshold),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div className="rounded-2xl border border-adm-border bg-adm-surface-card p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-adm-text">Müşteri</h2>
        <p className="mb-4 text-sm text-adm-text-secondary">
          Bir müşteri, ödenmiş toplam harcaması bu tutara ulaştığında VIP sayılır.
        </p>
        <label className="mb-1.5 block text-[13px] font-medium text-adm-text">
          VIP Eşiği (₺)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          required
          value={vipSpendThreshold}
          onChange={(e) => setVipSpendThreshold(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
        />
      </div>

      <div className="rounded-2xl border border-adm-border bg-adm-surface-card p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-adm-text">Stok</h2>
        <p className="mb-4 text-sm text-adm-text-secondary">
          Yeni bir ürün oluşturulurken kritik stok eşiği alanına önceden doldurulacak
          varsayılan değer. Mevcut ürünlerin kendi eşiklerini değiştirmez.
        </p>
        <label className="mb-1.5 block text-[13px] font-medium text-adm-text">
          Varsayılan Kritik Stok Eşiği
        </label>
        <input
          type="number"
          min="0"
          step="1"
          required
          value={defaultLowStockThreshold}
          onChange={(e) => setDefaultLowStockThreshold(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
        />
      </div>

      {error && <p className="text-xs text-adm-error">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-adm-primary px-5 py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50 rounded-xl"
        >
          {submitting ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {saved && <span className="text-sm text-adm-success">Kaydedildi.</span>}
      </div>
    </form>
  );
}
