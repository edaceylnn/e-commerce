"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { MANUAL_STOCK_MOVEMENT_TYPES, STOCK_MOVEMENT_TYPE_LABELS } from "@/lib/stockMovements";

type ProductOption = {
  id: number;
  title: string;
  variants: { id: string; sku: string; label: string }[];
};

export function AdminNewStockMovementButton({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [variantId, setVariantId] = useState("");
  const [type, setType] = useState<(typeof MANUAL_STOCK_MOVEMENT_TYPES)[number]>("RECEIVING");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === productId);
  const variantOptions = useMemo(() => selectedProduct?.variants ?? [], [selectedProduct]);

  function openModal() {
    setProductId(products[0]?.id ?? 0);
    setVariantId(products[0]?.variants[0]?.id ?? "");
    setType("RECEIVING");
    setQuantity("");
    setNote("");
    setError(null);
    setOpen(true);
  }

  function handleProductChange(id: number) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    setVariantId(product?.variants[0]?.id ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/stock-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        variantId: variantId || undefined,
        type,
        quantity: Number(quantity),
        note,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={openModal}
        disabled={products.length === 0}
        className="flex items-center gap-2 bg-adm-primary px-4 py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50 rounded-xl"
      >
        <PlusIcon className="h-5 w-5" />
        Manuel Stok Hareketi
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-adm-border bg-adm-surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-adm-text">Manuel Stok Hareketi</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">Ürün</label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              {variantOptions.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-adm-text">Varyant</label>
                  <select
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                  >
                    {variantOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} — {v.sku}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-adm-text">İşlem Tipi</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof type)}
                    className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                  >
                    {MANUAL_STOCK_MOVEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {STOCK_MOVEMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-adm-text">
                    Miktar (+/−)
                  </label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Örn: 50 veya -2"
                    className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">Açıklama</label>
                <textarea
                  required
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Örn: Tedarikçiden mal kabul"
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                />
              </div>
              {error && <p className="text-xs text-adm-error">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-adm-border bg-adm-surface-secondary px-5 py-2.5 text-sm font-semibold text-adm-text rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-adm-primary px-5 py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50 rounded-xl"
                >
                  {submitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
