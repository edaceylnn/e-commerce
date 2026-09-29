"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  SubArrowIcon,
  PlusIcon,
} from "@/components/icons/AdminLuxeIcons";
import { PencilIcon, TrashIcon } from "@/components/icons/AdminIcons";
import { StatusBadge } from "@/components/admin/StatusBadge";

type SubCategory = { id: string; label: string; productCount: number };
type TopCategory = {
  id: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
  children: SubCategory[];
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create-top" }
  | { mode: "create-sub"; parentId: string; parentLabel: string }
  | { mode: "edit"; id: string; label: string; description: string };

export function AdminCategoriesTree({
  categories,
}: {
  categories: TopCategory[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateTop() {
    setLabel("");
    setDescription("");
    setMetaTitle("");
    setMetaDescription("");
    setError(null);
    setModal({ mode: "create-top" });
  }

  function openCreateSub(parentId: string, parentLabel: string) {
    setLabel("");
    setDescription("");
    setMetaTitle("");
    setMetaDescription("");
    setError(null);
    setModal({ mode: "create-sub", parentId, parentLabel });
  }

  function openEdit(
    id: string,
    currentLabel: string,
    currentDescription: string,
    currentMetaTitle = "",
    currentMetaDescription = ""
  ) {
    setLabel(currentLabel);
    setDescription(currentDescription);
    setMetaTitle(currentMetaTitle);
    setMetaDescription(currentMetaDescription);
    setError(null);
    setModal({ mode: "edit", id, label: currentLabel, description: currentDescription });
  }

  async function handleDelete(id: string, childCount = 0) {
    const message =
      childCount > 0
        ? `Bu kategoriyi silmek, altındaki ${childCount} alt kategoriyi de silecek. Emin misiniz?`
        : "Bu kategoriyi silmek istediğinize emin misiniz?";
    if (!window.confirm(message)) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Silinemedi.");
      return;
    }
    router.refresh();
  }

  async function moveCategory(siblings: { id: string }[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    await Promise.all([
      fetch(`/api/admin/categories/${siblings[index].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: targetIndex }),
      }),
      fetch(`/api/admin/categories/${siblings[targetIndex].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: index }),
      }),
    ]);
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (modal.mode === "edit") {
      const res = await fetch(`/api/admin/categories/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, description, metaTitle, metaDescription }),
      });
      setSubmitting(false);
      if (!res.ok) {
        setError("Güncellenemedi.");
        return;
      }
    } else {
      const parentId = modal.mode === "create-sub" ? modal.parentId : undefined;
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, description, parentId, metaTitle, metaDescription }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) {
        setError(data.error ?? "Oluşturulamadı.");
        return;
      }
    }

    setModal({ mode: "closed" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-adm-text">Kategoriler</h2>
        <button
          onClick={openCreateTop}
          className="flex items-center gap-2 bg-adm-primary px-4 py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep rounded-xl"
        >
          <PlusIcon className="h-5 w-5" />
          Yeni Kategori Ekle
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((cat, catIndex) => {
          const isOpen = expanded.has(cat.id);
          return (
            <div key={cat.id} className="overflow-hidden border border-adm-border bg-adm-surface-secondary transition-colors hover:border-adm-text-tertiary rounded-xl">
              <div
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-adm-surface-card p-4"
                onClick={() => toggle(cat.id)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden bg-adm-surface-secondary">
                    {cat.imageUrl && (
                      <Image src={cat.imageUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-adm-text">{cat.label}</h3>
                      <span className="rounded-full bg-adm-primary-soft/35 px-2 py-0.5 text-xs font-medium text-adm-primary-deep">
                        {cat.productCount} Ürün
                      </span>
                    </div>
                    {cat.description && (
                      <p className="mt-0.5 text-sm text-adm-text-secondary">{cat.description}</p>
                    )}
                  </div>
                </div>
                {/* Wraps under the name on narrow screens instead of being
                    pushed off the edge. */}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveCategory(categories, catIndex, -1);
                    }}
                    disabled={catIndex === 0}
                    title="Yukarı taşı"
                    className="p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary hover:text-adm-text disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveCategory(categories, catIndex, 1);
                    }}
                    disabled={catIndex === categories.length - 1}
                    title="Aşağı taşı"
                    className="p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary hover:text-adm-text disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(cat.id, cat.label, cat.description ?? "", cat.metaTitle ?? "", cat.metaDescription ?? "");
                    }}
                    title="Düzenle"
                    className="p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary hover:text-adm-text"
                  >
                    <PencilIcon className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateSub(cat.id, cat.label);
                    }}
                    title="Alt Kategori Ekle"
                    className="p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary hover:text-adm-text"
                  >
                    <PlusIcon className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cat.id, cat.children.length);
                    }}
                    title="Sil"
                    className="p-2 text-adm-error transition hover:bg-adm-surface-secondary"
                  >
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </button>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-adm-text-secondary transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-adm-border/10 bg-adm-surface-secondary p-4">
                  {cat.children.length === 0 && (
                    <p className="px-3 text-sm text-adm-text-tertiary">Alt kategori yok.</p>
                  )}
                  {cat.children.map((sub, subIndex) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between border border-adm-border bg-adm-surface-card p-3 transition-colors hover:bg-adm-bg rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <SubArrowIcon className="h-4 w-4 text-adm-text-tertiary" />
                        <span className="text-sm font-medium text-adm-text">{sub.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-adm-text-secondary">{sub.productCount} Ürün</span>
                        <StatusBadge variant="success">Aktif</StatusBadge>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveCategory(cat.children, subIndex, -1)}
                            disabled={subIndex === 0}
                            className="rounded p-1 text-adm-text-tertiary hover:bg-adm-surface-secondary disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveCategory(cat.children, subIndex, 1)}
                            disabled={subIndex === cat.children.length - 1}
                            className="rounded p-1 text-adm-text-tertiary hover:bg-adm-surface-secondary disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => openEdit(sub.id, sub.label, "")}
                            className="rounded p-1 text-adm-text-tertiary hover:bg-adm-surface-secondary"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="rounded p-1 text-adm-error hover:bg-adm-surface-secondary"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal.mode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-adm-border bg-adm-surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-adm-text">
                {modal.mode === "edit"
                  ? "Kategoriyi Düzenle"
                  : modal.mode === "create-sub"
                    ? `${modal.parentLabel} — Alt Kategori Ekle`
                    : "Yeni Ana Kategori Ekle"}
              </h3>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="rounded-full p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">Kategori Adı</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  placeholder="Örn: Saç Bakım & Şekillendirme"
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">Kısa Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Kategori açıklaması girin..."
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">SEO Başlığı (opsiyonel)</label>
                <input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Arama motorlarında görünecek başlık"
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-adm-text">SEO Açıklaması (opsiyonel)</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  placeholder="Arama sonuçlarında görünecek açıklama"
                  className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                />
              </div>
              {error && <p className="text-xs text-adm-error">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal({ mode: "closed" })}
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
    </div>
  );
}
