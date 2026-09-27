"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, SubArrowIcon, PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { PencilIcon, TrashIcon } from "@/components/icons/AdminIcons";

type SizeRow = { id: string; label: string; variantCount: number };
type SizeGroupRow = {
  id: string;
  name: string;
  sizes: SizeRow[];
};

type ModalState =
  | { mode: "closed" }
  | { mode: "create-group" }
  | { mode: "edit-group"; id: string; name: string }
  | { mode: "create-size"; groupId: string; groupName: string }
  | { mode: "edit-size"; id: string; label: string };

export function AdminSizeGroupsPanel({ groups }: { groups: SizeGroupRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.id)));
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [value, setValue] = useState("");
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

  function openCreateGroup() {
    setValue("");
    setError(null);
    setModal({ mode: "create-group" });
  }

  function openEditGroup(id: string, name: string) {
    setValue(name);
    setError(null);
    setModal({ mode: "edit-group", id, name });
  }

  function openCreateSize(groupId: string, groupName: string) {
    setValue("");
    setError(null);
    setModal({ mode: "create-size", groupId, groupName });
  }

  function openEditSize(id: string, label: string) {
    setValue(label);
    setError(null);
    setModal({ mode: "edit-size", id, label });
  }

  async function handleDeleteGroup(id: string) {
    if (!window.confirm("Bu beden grubunu ve içindeki tüm bedenleri silmek istediğinize emin misiniz?"))
      return;
    const res = await fetch(`/api/admin/size-groups/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Silinemedi.");
      return;
    }
    router.refresh();
  }

  async function handleDeleteSize(id: string) {
    if (!window.confirm("Bu bedeni silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`/api/admin/sizes/${id}`, { method: "DELETE" });
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

    let res: Response;
    if (modal.mode === "edit-group") {
      res = await fetch(`/api/admin/size-groups/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
    } else if (modal.mode === "create-group") {
      res = await fetch("/api/admin/size-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
    } else if (modal.mode === "edit-size") {
      res = await fetch(`/api/admin/sizes/${modal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: value }),
      });
    } else if (modal.mode === "create-size") {
      res = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeGroupId: modal.groupId, label: value }),
      });
    } else {
      setSubmitting(false);
      return;
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

  const modalTitle =
    modal.mode === "edit-group"
      ? "Beden Grubunu Düzenle"
      : modal.mode === "create-group"
        ? "Yeni Beden Grubu Ekle"
        : modal.mode === "edit-size"
          ? "Bedeni Düzenle"
          : modal.mode === "create-size"
            ? `${modal.groupName} — Beden Ekle`
            : "";

  const fieldLabel =
    modal.mode === "create-size" || modal.mode === "edit-size" ? "Beden Etiketi" : "Grup Adı";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-adm-headline text-xl text-adm-on-surface">Beden Grupları</h2>
        <button
          onClick={openCreateGroup}
          className="flex items-center gap-2 bg-adm-primary px-4 py-2.5 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep"
        >
          <PlusIcon className="h-5 w-5" />
          Yeni Beden Grubu Ekle
        </button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 && (
          <p className="border border-adm-border bg-adm-surface-container-low p-4 text-sm text-adm-outline">
            Henüz beden grubu eklenmedi.
          </p>
        )}
        {groups.map((group) => {
          const isOpen = expanded.has(group.id);
          return (
            <div
              key={group.id}
              className="overflow-hidden border border-adm-border bg-adm-surface-container-low transition-colors hover:border-adm-text-tertiary"
            >
              <div
                className="flex cursor-pointer items-center justify-between bg-adm-surface-container-lowest p-4"
                onClick={() => toggle(group.id)}
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-adm-headline text-lg text-adm-on-surface">{group.name}</h3>
                  <span className="rounded-full bg-adm-primary-container/35 px-2 py-0.5 text-xs font-medium text-adm-on-primary-container">
                    {group.sizes.length} Beden
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditGroup(group.id, group.name);
                    }}
                    title="Düzenle"
                    className="p-2 text-adm-on-surface-variant transition hover:bg-adm-surface-container hover:text-adm-on-surface"
                  >
                    <PencilIcon className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateSize(group.id, group.name);
                    }}
                    title="Beden Ekle"
                    className="p-2 text-adm-on-surface-variant transition hover:bg-adm-surface-container hover:text-adm-on-surface"
                  >
                    <PlusIcon className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    title="Grubu Sil"
                    className="p-2 text-adm-error transition hover:bg-adm-surface-container"
                  >
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </button>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-adm-on-surface-variant transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-adm-outline-variant/10 bg-adm-surface-container-low p-4">
                  {group.sizes.length === 0 && (
                    <p className="px-3 text-sm text-adm-outline">Beden yok.</p>
                  )}
                  {group.sizes.map((size) => (
                    <div
                      key={size.id}
                      className="flex items-center justify-between border border-adm-border bg-adm-surface-container-lowest p-3 transition-colors hover:bg-adm-surface"
                    >
                      <div className="flex items-center gap-3">
                        <SubArrowIcon className="h-4 w-4 text-adm-outline" />
                        <span className="text-sm font-medium text-adm-on-surface">{size.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-adm-on-surface-variant">
                          {size.variantCount} Varyant
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSize(size.id, size.label)}
                            className="rounded p-1 text-adm-outline hover:bg-adm-surface-container"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSize(size.id)}
                            className="rounded p-1 text-adm-error hover:bg-adm-surface-container"
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
          <div className="w-full max-w-lg border border-adm-border bg-adm-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-adm-headline text-xl text-adm-on-surface">{modalTitle}</h3>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="rounded-full p-2 text-adm-on-surface-variant transition hover:bg-adm-surface-container-high"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-adm-on-surface-variant">{fieldLabel}</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  placeholder={
                    modal.mode === "create-size" || modal.mode === "edit-size" ? "Örn: XL" : "Örn: Standart"
                  }
                  className="w-full border border-adm-border bg-adm-surface-container-low p-3 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
                />
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
