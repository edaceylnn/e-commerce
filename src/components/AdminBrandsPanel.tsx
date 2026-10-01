"use client";

import { FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { Card } from "@/components/admin/Card";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { BadgeIcon, TrashIcon } from "@/components/icons/AdminIcons";

const inputClass =
  "rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

type Brand = {
  id: string;
  name: string;
  productCount: number;
};

export function AdminBrandsPanel({ brands }: { brands: Brand[] }) {
  const [rows, setRows] = useState(brands);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Oluşturulamadı.");
      return;
    }

    setRows((prev) => [{ id: data.id, name, productCount: 0 }, ...prev]);
    setName("");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu markayı silmek istediğinize emin misiniz?")) return;
    setError(null);
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Silinemedi.");
      return;
    }
    setRows((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-8">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-adm-text-secondary">
          <BadgeIcon className="h-4 w-4" />
          Yeni Marka
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text min-w-[220px] flex-1">
            Marka adı
            <input
              placeholder="örn. EDACEY"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <p className="w-full text-xs text-adm-danger">{error}</p>}
          <AdminButton type="submit" disabled={submitting} className="w-fit">
            {submitting ? "Oluşturuluyor…" : "Marka Ekle"}
          </AdminButton>
        </form>
      </Card>

      <AdminTable>
        <thead>
          <tr>
            <th>Marka</th>
            <th>Ürün Sayısı</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((brand) => (
            <tr key={brand.id}>
              <td className="font-semibold text-adm-text">{brand.name}</td>
              <td className="text-adm-text-secondary">{brand.productCount}</td>
              <td className="text-right whitespace-nowrap">
                <button
                  onClick={() => handleDelete(brand.id)}
                  aria-label="Sil"
                  className="inline-flex rounded-lg p-2 text-adm-text-tertiary transition hover:bg-adm-danger-soft hover:text-adm-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <AdminTableEmpty colSpan={3}>Henüz marka yok.</AdminTableEmpty>
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
