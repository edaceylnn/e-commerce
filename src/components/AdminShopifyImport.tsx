"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { StatusBadge, type StatusBadgeVariant } from "@/components/admin/StatusBadge";
import type { ImportPlan, ImportResult, PlannedProduct } from "@/lib/shopify-import";

const fieldClass =
  "w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";
const labelClass = "mb-1.5 block text-[13px] font-medium text-adm-text";

const ACTION: Record<PlannedProduct["action"], { label: string; variant: StatusBadgeVariant }> = {
  create: { label: "Yeni", variant: "success" },
  update: { label: "Güncellenecek", variant: "info" },
  skip: { label: "Atlanacak", variant: "danger" },
};

// Upload → preview (nothing written) → import → results.
export function AdminShopifyImport({ categories }: { categories: { id: string; label: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [fallbackCategoryId, setFallbackCategoryId] = useState(categories[0]?.id ?? "");
  const [taxRate, setTaxRate] = useState("20");
  const [updateStock, setUpdateStock] = useState(true);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function form() {
    const data = new FormData();
    data.set("file", file!);
    data.set("fallbackCategoryId", fallbackCategoryId);
    data.set("taxRate", taxRate);
    data.set("updateStock", String(updateStock));
    return data;
  }

  async function send(url: string) {
    const res = await fetch(url, { method: "POST", body: form() }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? "İşlem başarısız.");
      return null;
    }
    return data;
  }

  async function handlePreview(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy("preview");
    setError(null);
    setResults(null);
    setPlan(await send("/api/admin/products/import/preview"));
    setBusy(null);
  }

  async function handleImport() {
    setBusy("import");
    setError(null);
    const data = await send("/api/admin/products/import");
    if (data) {
      setResults(data.results);
      setPlan(null);
    }
    setBusy(null);
  }

  const toImport = plan?.products.filter((p) => p.action !== "skip").length ?? 0;
  const rows: (PlannedProduct & { done?: boolean })[] | null = results ?? plan?.products ?? null;

  return (
    <div className="space-y-5">
      <form onSubmit={handlePreview} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>CSV dosyası</span>
          <input
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPlan(null);
              setResults(null);
            }}
            className="block w-full text-sm text-adm-text-secondary file:mr-3 file:rounded-lg file:border file:border-adm-border file:bg-adm-surface-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-adm-text"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Kategori eşleşmezse</span>
          <select value={fallbackCategoryId} onChange={(e) => setFallbackCategoryId(e.target.value)} className={fieldClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Yeni ürünlerin KDV oranı</span>
          <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={fieldClass}>
            {["20", "10", "1", "0"].map((r) => (
              <option key={r} value={r}>
                %{r}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-adm-text-tertiary">Shopify CSV&apos;sinde KDV oranı yok.</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-adm-text sm:col-span-2">
          <input type="checkbox" checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} />
          Mevcut ürünlerin stoklarını dosyadakiyle değiştir
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <AdminButton type="submit" variant="secondary" size="sm" loading={busy === "preview"} disabled={!file}>
            Önizle
          </AdminButton>
          {plan && toImport > 0 && (
            <AdminButton type="button" size="sm" loading={busy === "import"} onClick={handleImport}>
              {toImport} ürünü içe aktar
            </AdminButton>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-adm-danger">{error}</p>}

      {plan && (
        <div className="space-y-2 rounded-xl bg-adm-surface-secondary px-4 py-3 text-sm text-adm-text">
          <p>
            <strong>{plan.products.filter((p) => p.action === "create").length}</strong> yeni ·{" "}
            <strong>{plan.products.filter((p) => p.action === "update").length}</strong> güncellenecek ·{" "}
            <strong>{plan.products.filter((p) => p.action === "skip").length}</strong> atlanacak
          </p>
          {plan.fileErrors.map((e) => (
            <p key={e} className="text-adm-danger">
              {e}
            </p>
          ))}
          {plan.newBrands.length > 0 && <p className="text-adm-text-secondary">Yeni markalar: {plan.newBrands.join(", ")}</p>}
          {plan.newColors.length > 0 && <p className="text-adm-text-secondary">Yeni renkler: {plan.newColors.join(", ")}</p>}
          {plan.newSizes.length > 0 && <p className="text-adm-text-secondary">Yeni bedenler: {plan.newSizes.join(", ")}</p>}
        </div>
      )}

      {results && (
        <p className="rounded-xl bg-adm-surface-secondary px-4 py-3 text-sm text-adm-text">
          <strong>{results.filter((r) => r.done).length}</strong> ürün kaydedildi ·{" "}
          <strong>{results.filter((r) => !r.done).length}</strong> atlandı
        </p>
      )}

      {rows && rows.length > 0 && (
        <ul className="divide-y divide-adm-border rounded-xl border border-adm-border">
          {rows.map((p) => {
            const action = results ? (p.done ? ACTION[p.action] : ACTION.skip) : ACTION[p.action];
            return (
              <li key={p.handle} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.done && p.productId ? (
                      <Link href={`/admin/products/${p.productId}`} className="text-sm font-semibold text-adm-text hover:underline">
                        {p.title || p.handle}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-adm-text">{p.title || p.handle}</p>
                    )}
                    <p className="text-xs text-adm-text-tertiary">
                      Satır {p.line} · {p.variantCount} varyant · {p.imageCount} görsel
                      {p.categoryLabel && ` · ${p.categoryLabel}`}
                      {p.productId && !results && ` · ürün #${p.productId}`}
                    </p>
                  </div>
                  <StatusBadge size="sm" variant={action.variant}>
                    {results && p.done ? (p.action === "create" ? "Oluşturuldu" : "Güncellendi") : action.label}
                  </StatusBadge>
                </div>
                {p.errors.map((e) => (
                  <p key={e} className="mt-1 text-xs text-adm-danger">
                    {e}
                  </p>
                ))}
                {p.warnings.map((w) => (
                  <p key={w} className="mt-1 text-xs text-adm-text-secondary">
                    {w}
                  </p>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
