"use client";

import { FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { formatPrice } from "@/lib/format";
import { Card } from "@/components/admin/Card";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SparklesIcon, PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { TrashIcon } from "@/components/icons/AdminIcons";

const inputClass =
  "rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

type Campaign = {
  id: string;
  name: string;
  discountPercentage: number;
  categoryLabel: string | null;
  brandName: string | null;
  minSpend: number | null;
  startAt: string;
  endAt: string;
  active: boolean;
  usage: number;
  revenue: number;
};

// Beyond the raw active/pasif flag, a campaign reads as Planlandı (not
// started yet) or Bitti (date range over) purely from its own start/end —
// real, derived state, not a second stored field to keep in sync.
function campaignStatus(campaign: Campaign): { variant: "success" | "info" | "neutral"; label: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (!campaign.active) return { variant: "neutral", label: "Pasif" };
  if (campaign.startAt > today) return { variant: "info", label: "Planlandı" };
  if (campaign.endAt < today) return { variant: "neutral", label: "Bitti" };
  return { variant: "success", label: "Aktif" };
}

// Uniform white cards, no "hero" treatment on the first one — the design
// deck's three featured-campaign cards read as equals (just a status badge
// each), never one filled/dark and the rest plain.
function CampaignHeroCard({ campaign }: { campaign: Campaign }) {
  const status = campaignStatus(campaign);
  return (
    <div className="rounded-2xl border border-adm-border bg-adm-surface-card p-5 text-adm-text">
      <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
      <p className="mt-4 text-3xl font-bold">%{campaign.discountPercentage}</p>
      <p className="mt-1 truncate text-sm font-medium">{campaign.name}</p>
      <p className="text-xs text-adm-text-tertiary">
        {campaign.startAt} – {campaign.endAt}
      </p>
      <div className="mt-4 flex gap-6 border-t border-adm-border pt-3 text-xs">
        <div>
          <p className="text-adm-text-tertiary">Kullanım</p>
          <p className="font-semibold">{campaign.usage}</p>
        </div>
        <div>
          <p className="text-adm-text-tertiary">Ciro</p>
          <p className="font-semibold">{formatPrice(campaign.revenue)}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminCampaignsPanel({
  campaigns,
  categories,
  brands,
}: {
  campaigns: Campaign[];
  categories: { id: string; label: string }[];
  brands: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(campaigns);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        discountPercentage: Number(discountPercentage),
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        minSpend: minSpend ? Number(minSpend) : undefined,
        startAt,
        endAt,
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
        name,
        discountPercentage: Number(discountPercentage),
        categoryLabel: categories.find((c) => c.id === categoryId)?.label ?? null,
        brandName: brands.find((b) => b.id === brandId)?.name ?? null,
        minSpend: minSpend ? Number(minSpend) : null,
        startAt,
        endAt,
        active: true,
        usage: 0,
        revenue: 0,
      },
      ...prev,
    ]);
    setName("");
    setDiscountPercentage("");
    setCategoryId("");
    setBrandId("");
    setMinSpend("");
    setStartAt("");
    setEndAt("");
    setShowForm(false);
  }

  async function handleToggle(id: string, active: boolean) {
    setRows((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !active } : c))
    );
    await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    setRows((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
  }

  const activeRows = rows.filter((c) => c.active);
  const featuredRows = (activeRows.length > 0 ? activeRows : rows).slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
          Öne Çıkan Kampanyalar
        </p>
        <AdminButton size="sm" onClick={() => setShowForm((v) => !v)}>
          <PlusIcon className="h-4 w-4" />
          Kampanya Oluştur
        </AdminButton>
      </div>

      {featuredRows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {featuredRows.map((campaign) => (
            <CampaignHeroCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {showForm && (
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-adm-text-secondary">
          <SparklesIcon className="h-4 w-4" />
          Yeni Kampanya
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text sm:col-span-2">
            Kampanya adı
            <input
              placeholder="örn. Yaz İndirimi"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            Kategori
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">Tüm kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            Marka
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={inputClass}
            >
              <option value="">Tüm markalar</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            İndirim oranı (%)
            <input
              placeholder="örn. 15"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            En az sepet tutarı (₺, opsiyonel)
            <input
              placeholder="Alt sınır yok"
              type="number"
              step="0.01"
              min="0"
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            Başlangıç
            <input
              type="date"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-adm-text">
            Bitiş
            <input
              type="date"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <p className="text-xs text-adm-danger sm:col-span-2">{error}</p>}
          <AdminButton
            type="submit"
            disabled={submitting}
            className="w-fit sm:col-span-2"
          >
            {submitting ? "Oluşturuluyor…" : "Kampanya Oluştur"}
          </AdminButton>
        </form>
      </Card>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
        Tüm Kampanyalar
      </p>
      <AdminTable>
        <thead>
          <tr>
            <th>Kampanya</th>
            <th>Kapsam</th>
            <th>İndirim</th>
            <th>Kullanım</th>
            <th>Ciro</th>
            <th>Tarih Aralığı</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((campaign) => {
            const status = campaignStatus(campaign);
            return (
            <tr key={campaign.id}>
              <td className="font-semibold text-adm-text">{campaign.name}</td>
              <td className="text-adm-text-secondary">
                {campaign.categoryLabel ?? campaign.brandName ?? "Tüm ürünler"}
                {campaign.minSpend
                  ? ` · min. ${formatPrice(campaign.minSpend)}`
                  : ""}
              </td>
              <td className="text-adm-text-secondary">%{campaign.discountPercentage}</td>
              <td className="text-adm-text-secondary">{campaign.usage}</td>
              <td className="text-adm-text-secondary">{formatPrice(campaign.revenue)}</td>
              <td className="text-adm-text-tertiary">
                {campaign.startAt} – {campaign.endAt}
              </td>
              <td>
                <StatusBadge variant={status.variant} size="sm">
                  {status.label}
                </StatusBadge>
              </td>
              <td className="text-right whitespace-nowrap">
                <button
                  onClick={() => handleToggle(campaign.id, campaign.active)}
                  className="mr-2 rounded-full border border-adm-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-adm-primary transition hover:border-adm-primary hover:bg-adm-primary-soft"
                >
                  {campaign.active ? "Pasifleştir" : "Aktifleştir"}
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  aria-label="Sil"
                  className="inline-flex rounded-lg p-2 text-adm-text-tertiary transition hover:bg-adm-danger-soft hover:text-adm-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
            );
          })}
          {rows.length === 0 && (
            <AdminTableEmpty colSpan={8}>Henüz kampanya yok.</AdminTableEmpty>
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
