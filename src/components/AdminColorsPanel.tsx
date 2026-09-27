"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { PencilIcon, TrashIcon } from "@/components/icons/AdminIcons";
import { StatusBadge } from "@/components/admin/StatusBadge";

type ColorRow = {
  id: string;
  name: string;
  hex: string;
  active: boolean;
  variantCount: number;
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: string };

export function AdminColorsPanel({ colors }: { colors: ColorRow[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#000000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setName("");
    setHex("#000000");
    setError(null);
    setModal({ mode: "create" });
  }

  function openEdit(color: ColorRow) {
    setName(color.name);
    setHex(color.hex);
    setError(null);
    setModal({ mode: "edit", id: color.id });
  }

  async function handleToggleActive(color: ColorRow) {
    await fetch(`/api/admin/colors/${color.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !color.active }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu rengi silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/colors/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Silinemedi.");
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const url = modal.mode === "edit" ? `/api/admin/colors/${modal.id}` : "/api/admin/colors";
    const res = await fetch(url, {
      method: modal.mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hex }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    setModal({ mode: "closed" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-adm-headline text-xl text-adm-on-surface">Renkler</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-adm-primary px-4 py-2.5 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep"
        >
          <PlusIcon className="h-5 w-5" />
          Yeni Renk Ekle
        </button>
      </div>

      <div className="space-y-3">
        {colors.length === 0 && (
          <p className="border border-adm-border bg-adm-surface-container-low p-4 text-sm text-adm-outline">
            Henüz renk eklenmedi.
          </p>
        )}
        {colors.map((color) => (
          <div
            key={color.id}
            className="flex items-center justify-between border border-adm-border bg-adm-surface-container-lowest p-4 transition-colors hover:border-adm-text-tertiary"
          >
            <div className="flex items-center gap-4">
              <span
                className="h-8 w-8 shrink-0 border border-adm-border"
                style={{ backgroundColor: color.hex }}
              />
              <div>
                <h3 className="font-adm-headline text-base text-adm-on-surface">{color.name}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-adm-on-surface-variant">
                  {color.hex}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-adm-on-surface-variant">
                {color.variantCount} Varyant
              </span>
              <button onClick={() => handleToggleActive(color)}>
                <StatusBadge variant={color.active ? "success" : "neutral"}>
                  {color.active ? "Aktif" : "Pasif"}
                </StatusBadge>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(color)}
                  className="rounded p-1 text-adm-outline hover:bg-adm-surface-container"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(color.id)}
                  className="rounded p-1 text-adm-error hover:bg-adm-surface-container"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal.mode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-adm-border bg-adm-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-adm-headline text-xl text-adm-on-surface">
                {modal.mode === "edit" ? "Rengi Düzenle" : "Yeni Renk Ekle"}
              </h3>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="rounded-full p-2 text-adm-on-surface-variant transition hover:bg-adm-surface-container-high"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Renk Adı</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Örn: Kum Bej"
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">Renk Kodu</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer border border-adm-border bg-adm-surface-container-low"
                  />
                  <input
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    required
                    placeholder="#RRGGBB"
                    className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-adm-error">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal({ mode: "closed" })}
                  className="border border-adm-border bg-adm-surface-container-high px-5 py-3 text-sm font-medium text-adm-on-surface"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-adm-primary px-5 py-3 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50"
                >
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
