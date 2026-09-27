"use client";

import { FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { formatPrice } from "@/lib/format";
import { Card } from "@/components/admin/Card";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TagIcon, TrashIcon } from "@/components/icons/AdminIcons";

const inputClass =
  "rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

type Coupon = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export function AdminCouponsPanel({ coupons }: { coupons: Coupon[] }) {
  const [rows, setRows] = useState(coupons);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        expiresAt: expiresAt || undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Oluşturulamadı.");
      return;
    }

    setRows((prev) => [
      {
        id: data.id,
        code: code.toUpperCase(),
        type,
        value: Number(value),
        expiresAt: expiresAt || null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        usedCount: 0,
        active: true,
      },
      ...prev,
    ]);
    setCode("");
    setValue("");
    setExpiresAt("");
    setUsageLimit("");
  }

  async function handleToggle(id: string, active: boolean) {
    setRows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !active } : c))
    );
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu kuponu silmek istediğinize emin misiniz?")) return;
    setRows((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-8">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-adm-text-tertiary">
          <TagIcon className="h-4 w-4" />
          Yeni Kupon
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Kod (örn. HOSGELDIN10)"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} sm:col-span-2`}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "PERCENTAGE" | "FIXED")}
            className={inputClass}
          >
            <option value="PERCENTAGE">Yüzde (%)</option>
            <option value="FIXED">Sabit tutar (₺)</option>
          </select>
          <input
            placeholder={type === "PERCENTAGE" ? "Değer (%)" : "Değer (₺)"}
            type="number"
            step="0.01"
            min="0"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Kullanım limiti (opsiyonel)"
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-xs text-adm-danger sm:col-span-2">{error}</p>}
          <AdminButton
            type="submit"
            disabled={submitting}
            className="w-fit sm:col-span-2"
          >
            {submitting ? "Oluşturuluyor…" : "Kupon Oluştur"}
          </AdminButton>
        </form>
      </Card>

      <AdminTable>
        <thead>
          <tr className="border-b border-adm-border bg-adm-surface-secondary text-[11px] font-semibold uppercase tracking-widest text-adm-text-tertiary">
            <th className="py-3 pl-4 pr-4">Kod</th>
            <th className="py-3 pr-4">Değer</th>
            <th className="py-3 pr-4">Kullanım</th>
            <th className="py-3 pr-4">Son Kullanma</th>
            <th className="py-3 pr-4">Durum</th>
            <th className="py-3 pr-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-adm-border">
          {rows.map((coupon) => (
            <tr key={coupon.id}>
              <td className="py-3 pl-4 pr-4 font-semibold text-adm-text">{coupon.code}</td>
              <td className="py-3 pr-4 text-adm-text-secondary">
                {coupon.type === "PERCENTAGE"
                  ? `%${coupon.value}`
                  : formatPrice(coupon.value)}
              </td>
              <td className="py-3 pr-4 text-adm-text-secondary">
                {coupon.usedCount}
                {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
              </td>
              <td className="py-3 pr-4 text-adm-text-secondary">{coupon.expiresAt ?? "—"}</td>
              <td className="py-3 pr-4">
                <StatusBadge variant={coupon.active ? "success" : "neutral"} size="sm">
                  {coupon.active ? "Aktif" : "Pasif"}
                </StatusBadge>
              </td>
              <td className="py-3 pr-4 text-right whitespace-nowrap">
                <button
                  onClick={() => handleToggle(coupon.id, coupon.active)}
                  className="mr-2 rounded-full border border-adm-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-adm-primary transition hover:border-adm-primary hover:bg-adm-primary-soft"
                >
                  {coupon.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button
                  onClick={() => handleDelete(coupon.id)}
                  aria-label="Sil"
                  className="inline-flex rounded-lg p-2 text-adm-text-tertiary transition hover:bg-adm-danger-soft hover:text-adm-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <AdminTableEmpty colSpan={6}>Henüz kupon yok.</AdminTableEmpty>
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
