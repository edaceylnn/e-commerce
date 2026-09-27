"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { TrashIcon } from "@/components/icons/AdminIcons";
import { SIZE_CHART_COLUMNS } from "@/lib/sizeCharts";

type SizeChartRow = {
  id: string;
  name: string;
  sizeGroupName: string;
  unit: string;
  columns: string[];
  productCount: number;
};

export function AdminSizeChartsPanel({
  sizeCharts,
  sizeGroups,
}: {
  sizeCharts: SizeChartRow[];
  sizeGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sizeGroupId, setSizeGroupId] = useState(sizeGroups[0]?.id ?? "");
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [columns, setColumns] = useState<string[]>(["chest", "waist"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setName("");
    setSizeGroupId(sizeGroups[0]?.id ?? "");
    setUnit("cm");
    setColumns(["chest", "waist"]);
    setError(null);
    setOpen(true);
  }

  function toggleColumn(key: string) {
    setColumns((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu beden tablosunu silmek istediğinize emin misiniz? Bağlı ürünler beden tablosuz kalır."))
      return;
    const res = await fetch(`/api/admin/size-charts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Silinemedi.");
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/size-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sizeGroupId, unit, columns }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    setOpen(false);
    router.push(`/admin/size-charts/${data.id}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-adm-headline text-xl text-adm-on-surface">Beden Tabloları</h2>
        <button
          onClick={openCreate}
          disabled={sizeGroups.length === 0}
          className="flex items-center gap-2 bg-adm-primary px-4 py-2.5 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          Yeni Beden Tablosu Ekle
        </button>
      </div>

      {sizeGroups.length === 0 && (
        <p className="mb-4 border border-adm-border bg-adm-surface-container-low p-4 text-sm text-adm-outline">
          Önce en az bir beden grubu oluşturun (Bedenler sayfası).
        </p>
      )}

      <div className="space-y-3">
        {sizeCharts.length === 0 && (
          <p className="border border-adm-border bg-adm-surface-container-low p-4 text-sm text-adm-outline">
            Henüz beden tablosu eklenmedi.
          </p>
        )}
        {sizeCharts.map((chart) => (
          <div
            key={chart.id}
            className="flex items-center justify-between border border-adm-border bg-adm-surface-container-lowest p-4 transition-colors hover:border-adm-text-tertiary"
          >
            <Link href={`/admin/size-charts/${chart.id}`} className="flex-1">
              <h3 className="font-adm-headline text-base text-adm-on-surface">{chart.name}</h3>
              <p className="mt-0.5 text-xs text-adm-on-surface-variant">
                {chart.sizeGroupName} · {chart.columns.length} kolon · {chart.unit}
              </p>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-adm-on-surface-variant">{chart.productCount} Ürün</span>
              <button
                onClick={() => handleDelete(chart.id)}
                className="rounded p-1 text-adm-error hover:bg-adm-surface-container"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-adm-border bg-adm-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-adm-headline text-xl text-adm-on-surface">Yeni Beden Tablosu</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-adm-on-surface-variant transition hover:bg-adm-surface-container-high"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Ad</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Örn: Kadın Üst Giyim"
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Beden Grubu</label>
                <select
                  value={sizeGroupId}
                  onChange={(e) => setSizeGroupId(e.target.value)}
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                >
                  {sizeGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Birim</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "cm" | "inch")}
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                >
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Ölçü Kolonları</label>
                <div className="flex flex-wrap gap-3">
                  {SIZE_CHART_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm text-adm-on-surface">
                      <input
                        type="checkbox"
                        checked={columns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="accent-adm-primary"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-adm-error">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-adm-border bg-adm-surface-container-high px-5 py-3 text-sm font-medium text-adm-on-surface"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting || columns.length === 0}
                  className="bg-adm-primary px-5 py-3 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
