"use client";

import { Fragment, FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { Card } from "@/components/admin/Card";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { DropletIcon, TrashIcon } from "@/components/icons/AdminIcons";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons/AdminLuxeIcons";

const inputClass =
  "rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

type IngredientProduct = { id: number; title: string };

type Ingredient = {
  id: string;
  name: string;
  description: string | null;
  products: IngredientProduct[];
};

export function AdminIngredientsPanel({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [rows, setRows] = useState(ingredients);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Oluşturulamadı.");
      return;
    }

    setRows((prev) => [
      { id: data.id, name, description: description || null, products: [] },
      ...prev,
    ]);
    setName("");
    setDescription("");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu içeriği silmek istediğinize emin misiniz?")) return;
    setError(null);
    const res = await fetch(`/api/admin/ingredients/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Silinemedi.");
      return;
    }
    setRows((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-8">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-adm-text-tertiary">
          <DropletIcon className="h-4 w-4" />
          Yeni Aktif İçerik
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="İçerik adı (örn. Niacinamide)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Kısa açıklama (opsiyonel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-xs text-adm-danger sm:col-span-2">{error}</p>}
          <AdminButton
            type="submit"
            disabled={submitting}
            className="w-fit sm:col-span-2"
          >
            {submitting ? "Oluşturuluyor…" : "İçerik Ekle"}
          </AdminButton>
        </form>
      </Card>

      <AdminTable>
        <thead>
          <tr className="border-b border-adm-border bg-adm-surface-secondary text-[11px] font-semibold uppercase tracking-widest text-adm-text-tertiary">
            <th className="py-3 pl-4 pr-4" />
            <th className="py-3 pr-4">İçerik</th>
            <th className="py-3 pr-4">Kullanan Ürün Sayısı</th>
            <th className="py-3 pr-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-adm-border">
          {rows.map((ingredient) => {
            const isOpen = expanded === ingredient.id;
            return (
              <Fragment key={ingredient.id}>
                <tr>
                  <td className="py-3 pl-4 pr-2">
                    <button
                      onClick={() =>
                        setExpanded(isOpen ? null : ingredient.id)
                      }
                      aria-label="Kullanan ürünleri göster"
                      className="inline-flex rounded-lg p-1 text-adm-text-tertiary transition hover:bg-adm-primary-soft hover:text-adm-primary"
                    >
                      {isOpen ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-adm-text">{ingredient.name}</span>
                    {ingredient.description && (
                      <p className="text-xs text-adm-text-tertiary">
                        {ingredient.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-adm-text-secondary">{ingredient.products.length}</td>
                  <td className="py-3 pr-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(ingredient.id)}
                      aria-label="Sil"
                      className="inline-flex rounded-lg p-2 text-adm-text-tertiary transition hover:bg-adm-danger-soft hover:text-adm-danger"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td />
                    <td colSpan={3} className="pb-4 pr-4">
                      {ingredient.products.length === 0 ? (
                        <p className="text-xs text-adm-text-tertiary">
                          Bu içeriği kullanan ürün yok.
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-2">
                          {ingredient.products.map((product) => (
                            <li
                              key={product.id}
                              className="rounded-full bg-adm-surface-secondary px-3 py-1 text-xs font-medium text-adm-text-secondary"
                            >
                              {product.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <AdminTableEmpty colSpan={4}>Henüz aktif içerik yok.</AdminTableEmpty>
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
