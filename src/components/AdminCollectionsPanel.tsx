"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { PencilIcon } from "@/components/icons/AdminIcons";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Collection = {
  id: string;
  label: string;
  description: string | null;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  productCount: number;
};

type ModalState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; id: string };

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function AdminCollectionsPanel({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [productIds, setProductIds] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setLabel("");
    setDescription("");
    setProductIds("");
    setStartAt("");
    setEndAt("");
    setError(null);
    setModal({ mode: "create" });
  }

  function openEdit(col: Collection) {
    setLabel(col.label);
    setDescription(col.description ?? "");
    setProductIds("");
    setStartAt(toDateInputValue(col.startAt));
    setEndAt(toDateInputValue(col.endAt));
    setError(null);
    setModal({ mode: "edit", id: col.id });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let res: Response;
    if (modal.mode === "edit") {
      res = await fetch(`/api/admin/collections/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          description,
          startAt: startAt || null,
          endAt: endAt || null,
        }),
      });
    } else {
      const ids = productIds
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n));
      res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          description,
          productIds: ids,
          startAt: startAt || undefined,
          endAt: endAt || undefined,
        }),
      });
    }

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    setModal({ mode: "closed" });
    router.refresh();
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/admin/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu koleksiyonu silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="border border-adm-border bg-adm-surface-container-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-adm-headline text-lg text-adm-on-surface">Özel Koleksiyonlar</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 text-sm font-medium text-adm-primary hover:underline"
        >
          <PlusIcon className="h-4 w-4" /> Ekle
        </button>
      </div>
      <p className="mb-4 text-sm text-adm-on-surface-variant">
        Mağaza vitrininde öne çıkan özel temalı ürün grupları.
      </p>
      <div className="space-y-3">
        {collections.length === 0 && (
          <p className="text-sm text-adm-outline">Henüz koleksiyon yok.</p>
        )}
        {collections.map((col) => {
          const isExpired = col.endAt ? new Date(col.endAt) < new Date() : false;
          return (
            <div
              key={col.id}
              className={`border border-adm-border bg-adm-surface-container-lowest p-3 ${
                col.active ? "border-l-4 border-adm-primary" : "border-l-4 border-adm-outline-variant"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-adm-on-surface">{col.label}</h4>
                    {isExpired && <StatusBadge variant="warning">Süresi Doldu</StatusBadge>}
                  </div>
                  {col.description && (
                    <p className="text-xs text-adm-on-surface-variant">{col.description}</p>
                  )}
                  {(col.startAt || col.endAt) && (
                    <p className="mt-0.5 text-xs text-adm-on-surface-variant">
                      {col.startAt ? toDateInputValue(col.startAt) : "—"} → {col.endAt ? toDateInputValue(col.endAt) : "—"}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-adm-primary-container/30 px-2.5 py-1 text-xs font-semibold text-adm-on-primary-container">
                  {col.productCount} Ürün
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <button onClick={() => openEdit(col)} className="flex items-center gap-1 font-medium text-adm-primary hover:underline">
                  <PencilIcon className="h-3.5 w-3.5" /> Düzenle
                </button>
                <button onClick={() => handleToggle(col.id, col.active)} className="font-medium text-adm-primary hover:underline">
                  {col.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button onClick={() => handleDelete(col.id)} className="font-medium text-adm-error hover:underline">
                  Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal.mode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-adm-border bg-adm-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-adm-headline text-xl text-adm-on-surface">
                {modal.mode === "edit" ? "Koleksiyonu Düzenle" : "Yeni Koleksiyon"}
              </h3>
              <button onClick={() => setModal({ mode: "closed" })} className="rounded-full p-2 text-adm-on-surface-variant hover:bg-adm-surface-container-high">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Koleksiyon Adı</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  placeholder="Örn: Altın Işıltısı Serisi"
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Kısa Açıklama</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn: 24K altın katkılı lüks formüller"
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-adm-on-surface-variant">Başlangıç (opsiyonel)</label>
                  <input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-adm-on-surface-variant">Bitiş (opsiyonel)</label>
                  <input
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                  />
                </div>
              </div>
              {modal.mode === "create" && (
                <div>
                  <label className="mb-1 block text-sm text-adm-on-surface-variant">Ürün ID&apos;leri (virgülle ayır, opsiyonel)</label>
                  <input
                    value={productIds}
                    onChange={(e) => setProductIds(e.target.value)}
                    placeholder="Örn: 1, 6, 118"
                    className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                  />
                </div>
              )}
              {error && <p className="text-xs text-adm-error">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal({ mode: "closed" })} className="border border-adm-border bg-adm-surface-container-high px-5 py-3 text-sm font-medium text-adm-on-surface">
                  İptal
                </button>
                <button type="submit" disabled={submitting} className="bg-adm-primary px-5 py-3 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50">
                  {submitting ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
