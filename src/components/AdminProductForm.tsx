"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { formatPrice } from "@/lib/format";
import { AdminButton } from "@/components/admin/Button";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { TrashIcon } from "@/components/icons/AdminIcons";

const inputClass =
  "w-full rounded-md border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary";

const SKIN_TYPE_OPTIONS = ["Kuru Cilt", "Yağlı Cilt", "Karma Cilt", "Normal Cilt", "Hassas Cilt"];
const SKIN_CONCERN_OPTIONS = ["Akne", "Leke", "Kırışıklık", "Gözenek", "Donuk Görünüm", "Kızarıklık"];
const FINISH_OPTIONS = ["Mat", "Saten", "Parlak", "Doğal"];
const COVERAGE_OPTIONS = ["Hafif", "Orta", "Tam"];
const TEXTURE_OPTIONS = ["Krem", "Sıvı", "Jel", "Toz", "Balm"];

const STATUS_OPTIONS: { value: "DRAFT" | "ACTIVE" | "ARCHIVED"; label: string }[] = [
  { value: "DRAFT", label: "Taslak" },
  { value: "ACTIVE", label: "Yayında" },
  { value: "ARCHIVED", label: "Arşiv" },
];

const SECTIONS = [
  { key: "info", label: "Ürün Bilgileri" },
  { key: "media", label: "Medya" },
  { key: "variants", label: "Varyantlar" },
  { key: "pricing", label: "Fiyatlandırma" },
  { key: "inventory", label: "Stok" },
  { key: "cosmetic", label: "Kozmetik Detaylar" },
  { key: "ingredients", label: "İçerikler" },
  { key: "seo", label: "SEO" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export type AdminProductVariantInitial = {
  id?: string;
  colorId: string;
  sizeId: string;
  sku: string;
  stock: number;
  priceOverride?: number;
  lowStockThreshold?: number;
};

export type AdminProductImageInitial = {
  url: string;
  altText?: string;
  colorId?: string;
};

export type AdminProductInitial = {
  title: string;
  description: string;
  categorySlug: string;
  price: number;
  discountPercentage: number;
  cost?: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  brandId?: string;
  sizeChartId?: string;
  tags: string[];
  isNew: boolean;
  thumbnail: string;
  images: AdminProductImageInitial[];
  variants: AdminProductVariantInitial[];
  skinTypes: string[];
  skinConcerns: string[];
  finish?: string;
  coverage?: string;
  texture?: string;
  usagePurpose?: string;
  fullIngredients?: string;
  usageInstructions?: string;
  warnings?: string;
  isVegan: boolean;
  isCrueltyFree: boolean;
  isParabenFree: boolean;
  spf?: number;
  volumeLabel?: string;
  origin?: string;
  expiryInfo?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  ingredientIds: string[];
};

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-6 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-tertiary">
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-adm-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function AdminProductForm({
  productId,
  initial,
  brands,
  ingredients,
  colors,
  sizes,
  sizeCharts,
  defaultLowStockThreshold = 10,
}: {
  productId?: number;
  initial?: AdminProductInitial;
  brands: { id: string; name: string }[];
  ingredients: { id: string; name: string }[];
  colors: { id: string; name: string; hex: string }[];
  sizes: { id: string; label: string }[];
  sizeCharts: { id: string; name: string }[];
  // Admin-configurable via Ayarlar (Bölüm 40) — only used to prefill a
  // brand-new product's threshold; an existing product keeps its own value.
  defaultLowStockThreshold?: number;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("info");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? PRODUCT_CATEGORIES[0].slug);
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [discountPercentage, setDiscountPercentage] = useState(
    initial ? String(initial.discountPercentage) : "0"
  );
  const [cost, setCost] = useState(initial?.cost !== undefined ? String(initial.cost) : "");
  const [taxRate, setTaxRate] = useState(initial ? String(initial.taxRate) : "20");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "0");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initial ? String(initial.lowStockThreshold) : String(defaultLowStockThreshold)
  );
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [sizeChartId, setSizeChartId] = useState(initial?.sizeChartId ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [images, setImages] = useState<AdminProductImageInitial[]>(initial?.images ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");

  const [variants, setVariants] = useState<AdminProductVariantInitial[]>(initial?.variants ?? []);
  const [skinTypes, setSkinTypes] = useState<string[]>(initial?.skinTypes ?? []);
  const [skinConcerns, setSkinConcerns] = useState<string[]>(initial?.skinConcerns ?? []);
  const [finish, setFinish] = useState(initial?.finish ?? "");
  const [coverage, setCoverage] = useState(initial?.coverage ?? "");
  const [texture, setTexture] = useState(initial?.texture ?? "");
  const [usagePurpose, setUsagePurpose] = useState(initial?.usagePurpose ?? "");
  const [fullIngredients, setFullIngredients] = useState(initial?.fullIngredients ?? "");
  const [usageInstructions, setUsageInstructions] = useState(initial?.usageInstructions ?? "");
  const [warnings, setWarnings] = useState(initial?.warnings ?? "");
  const [isVegan, setIsVegan] = useState(initial?.isVegan ?? false);
  const [isCrueltyFree, setIsCrueltyFree] = useState(initial?.isCrueltyFree ?? false);
  const [isParabenFree, setIsParabenFree] = useState(initial?.isParabenFree ?? false);
  const [spf, setSpf] = useState(initial?.spf ? String(initial.spf) : "");
  const [volumeLabel, setVolumeLabel] = useState(initial?.volumeLabel ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [expiryInfo, setExpiryInfo] = useState(initial?.expiryInfo ?? "");
  const [ingredientIds, setIngredientIds] = useState<string[]>(initial?.ingredientIds ?? []);

  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(initial?.status ?? "DRAFT");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleInList(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { colorId: colors[0]?.id ?? "", sizeId: sizes[0]?.id ?? "", sku: "", stock: 0 },
    ]);
  }

  function updateVariant(index: number, patch: Partial<AdminProductVariantInitial>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function addImage() {
    const url = newImageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, { url }]);
    setNewImageUrl("");
    if (!thumbnail) setThumbnail(url);
  }

  function updateImage(index: number, patch: Partial<AdminProductImageInitial>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      // The cover image can't point at a photo that no longer exists — the
      // next remaining one takes over automatically (PRD edge case).
      if (removed?.url === thumbnail) {
        setThumbnail(next[0]?.url ?? "");
      }
      return next;
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      title,
      description,
      categorySlug,
      price: Number(price),
      discountPercentage: Number(discountPercentage),
      cost: cost ? Number(cost) : undefined,
      taxRate: Number(taxRate),
      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      brandId: brandId || undefined,
      sizeChartId: sizeChartId || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      isNew,
      thumbnail,
      images: images.map((img) => ({
        url: img.url,
        altText: img.altText || undefined,
        colorId: img.colorId || undefined,
      })),
      variants: variants.map((v) => ({
        id: v.id,
        colorId: v.colorId,
        sizeId: v.sizeId,
        sku: v.sku,
        stock: Number(v.stock),
        priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
        lowStockThreshold:
          v.lowStockThreshold !== undefined && v.lowStockThreshold !== null
            ? Number(v.lowStockThreshold)
            : undefined,
      })),
      skinTypes,
      skinConcerns,
      finish: finish || undefined,
      coverage: coverage || undefined,
      texture: texture || undefined,
      usagePurpose: usagePurpose || undefined,
      fullIngredients: fullIngredients || undefined,
      usageInstructions: usageInstructions || undefined,
      warnings: warnings || undefined,
      isVegan,
      isCrueltyFree,
      isParabenFree,
      spf: spf ? Number(spf) : undefined,
      volumeLabel: volumeLabel || undefined,
      origin: origin || undefined,
      expiryInfo: expiryInfo || undefined,
      ingredientIds,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      status,
    };

    const res = await fetch(
      productId ? `/api/admin/products/${productId}` : "/api/admin/products",
      {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  const discounted = Number(price || 0) * (1 - Number(discountPercentage || 0) / 100);
  const costValue = cost ? Number(cost) : undefined;
  const grossProfit = costValue !== undefined ? Number(price || 0) - costValue : undefined;
  const marginPercent =
    grossProfit !== undefined && Number(price || 0) > 0 ? (grossProfit / Number(price)) * 100 : undefined;
  const discountedGrossProfit = costValue !== undefined ? discounted - costValue : undefined;
  const discountedMarginPercent =
    discountedGrossProfit !== undefined && discounted > 0 ? (discountedGrossProfit / discounted) * 100 : undefined;
  const brandName = brands.find((b) => b.id === brandId)?.name;
  const categoryLabel = PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug)?.label;

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[180px_1fr_300px]">
      {/* Section nav */}
      <nav className="hidden xl:block">
        <ul className="sticky top-24 space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  activeSection === s.key
                    ? "bg-adm-primary-soft font-medium text-adm-primary-deep"
                    : "text-adm-text-secondary hover:bg-adm-surface-secondary hover:text-adm-text"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <form onSubmit={handleSubmit} className="min-w-0">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SectionKey)}
          className={`${inputClass} mb-6 xl:hidden`}
        >
          {SECTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <div className={activeSection === "info" ? "space-y-4" : "hidden"}>
          <SectionTitle>Ürün Bilgileri</SectionTitle>
          <Field label="Başlık">
            <input
              placeholder="Başlık"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Açıklama">
            <textarea
              placeholder="Açıklama"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori">
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={inputClass}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Marka">
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputClass}>
                <option value="">Marka seçilmedi</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Etiketler (virgülle ayır)">
            <input
              placeholder="Etiketler (virgülle ayır)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-adm-text">
            <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="accent-adm-primary" />
            &quot;Yeni&quot; rozeti göster
          </label>
        </div>

        <div className={activeSection === "media" ? "space-y-4" : "hidden"}>
          <SectionTitle>Medya</SectionTitle>
          <Field label="Kapak görseli URL">
            <input
              placeholder="Kapak görseli URL"
              required
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2">
            <input
              placeholder="Yeni görsel URL'si ekle"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addImage();
                }
              }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={addImage}
              className="shrink-0 rounded-md border border-adm-border bg-adm-surface-card px-4 text-sm font-medium text-adm-text transition hover:bg-adm-surface-secondary"
            >
              Ekle
            </button>
          </div>

          {images.length === 0 && (
            <p className="text-xs text-adm-danger">
              En az bir galeri görseli gerekli — üstteki alandan bir URL ekleyin.
            </p>
          )}

          <div className="space-y-2">
            {images.map((img, index) => (
              <div key={`${img.url}-${index}`} className="flex flex-wrap items-start gap-3 border border-adm-border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-md border border-adm-border object-cover"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  onLoad={(e) => (e.currentTarget.style.visibility = "visible")}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-xs text-adm-text-tertiary">{img.url}</p>
                  <input
                    placeholder="Alt text (SEO / erişilebilirlik)"
                    value={img.altText ?? ""}
                    onChange={(e) => updateImage(index, { altText: e.target.value })}
                    className={`${inputClass} py-1.5 text-xs`}
                  />
                  {!img.altText && (
                    <p className="text-[11px] text-adm-text-tertiary">
                      Alt text boş — SEO ve erişilebilirlik için önerilir.
                    </p>
                  )}
                  <select
                    value={img.colorId ?? ""}
                    onChange={(e) => updateImage(index, { colorId: e.target.value || undefined })}
                    className={`${inputClass} py-1.5 text-xs`}
                  >
                    <option value="">Tüm renkler (genel görsel)</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        Sadece: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0}
                      aria-label="Yukarı taşı"
                      className="rounded p-1 text-adm-text-tertiary hover:bg-adm-surface-secondary disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, 1)}
                      disabled={index === images.length - 1}
                      aria-label="Aşağı taşı"
                      className="rounded p-1 text-adm-text-tertiary hover:bg-adm-surface-secondary disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setThumbnail(img.url)}
                    disabled={thumbnail === img.url}
                    className="text-xs font-medium text-adm-primary hover:underline disabled:text-adm-text-tertiary disabled:no-underline"
                  >
                    {thumbnail === img.url ? "Ana görsel" : "Ana görsel yap"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label="Görseli sil"
                    className="inline-flex rounded-md p-1 text-adm-danger transition hover:bg-adm-danger-soft"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={activeSection === "variants" ? "space-y-3" : "hidden"}>
          <SectionTitle>Varyantlar</SectionTitle>
          <Field label="Beden Tablosu">
            <select
              value={sizeChartId}
              onChange={(e) => setSizeChartId(e.target.value)}
              className={`${inputClass} mb-2`}
            >
              <option value="">Beden tablosu yok</option>
              {sizeCharts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {colors.length === 0 || sizes.length === 0 ? (
            <p className="text-xs text-adm-danger">
              Varyant eklemeden önce en az bir renk ve bir beden tanımlanmış olmalı.
            </p>
          ) : null}
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `new-${index}`}
              className="flex flex-wrap items-center gap-2 border border-adm-border p-3"
            >
              <span
                className="h-9 w-9 shrink-0 border border-adm-border"
                style={{
                  backgroundColor: colors.find((c) => c.id === variant.colorId)?.hex ?? "#e8e3df",
                }}
                title="Renk"
              />
              <select
                required
                value={variant.colorId}
                onChange={(e) => updateVariant(index, { colorId: e.target.value })}
                className={`${inputClass} w-36`}
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={variant.sizeId}
                onChange={(e) => updateVariant(index, { sizeId: e.target.value })}
                className={`${inputClass} w-24`}
              >
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                placeholder="SKU"
                required
                value={variant.sku}
                onChange={(e) => updateVariant(index, { sku: e.target.value })}
                className={`${inputClass} w-32`}
              />
              <input
                placeholder="Varyant stoğu"
                type="number"
                min="0"
                value={variant.stock}
                onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                className={`${inputClass} w-24`}
              />
              <input
                placeholder="Fiyat override (₺)"
                type="number"
                step="0.01"
                min="0"
                value={variant.priceOverride ?? ""}
                onChange={(e) =>
                  updateVariant(index, { priceOverride: e.target.value ? Number(e.target.value) : undefined })
                }
                className={`${inputClass} w-36`}
              />
              <input
                placeholder={`Kritik eşik (varsayılan: ${lowStockThreshold || 10})`}
                title="Kritik eşik — boş bırakılırsa ürünün genel eşiğinden miras alınır"
                type="number"
                min="0"
                value={variant.lowStockThreshold ?? ""}
                onChange={(e) =>
                  updateVariant(index, {
                    lowStockThreshold: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className={`${inputClass} w-44`}
              />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                aria-label="Varyantı sil"
                className="inline-flex rounded-md p-2 text-adm-danger transition hover:bg-adm-danger-soft"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 text-sm font-medium text-adm-primary hover:underline"
          >
            <PlusIcon className="h-4 w-4" /> Varyant Ekle
          </button>
        </div>

        <div className={activeSection === "pricing" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <SectionTitle>Fiyatlandırma</SectionTitle>
          <Field label="Fiyat (₺)">
            <input
              placeholder="Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="İndirim (%)">
            <input
              placeholder="İndirim (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Maliyet (₺)">
            <input
              placeholder="Maliyet (₺)"
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="KDV Oranı (%)">
            <input
              placeholder="KDV Oranı (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className={inputClass}
            />
          </Field>

          {costValue !== undefined && (
            <div className="sm:col-span-2 space-y-1.5 border border-adm-border bg-adm-surface-container-low p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-adm-text-secondary">Brüt kar</span>
                <span className="font-medium text-adm-text">{formatPrice(grossProfit ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-adm-text-secondary">Kar marjı</span>
                <span
                  className={`font-medium ${(marginPercent ?? 0) < 0 ? "text-adm-danger" : "text-adm-text"}`}
                >
                  %{(marginPercent ?? 0).toFixed(1)}
                </span>
              </div>
              {Number(discountPercentage || 0) > 0 && (
                <div className="flex items-center justify-between border-t border-adm-outline-variant/20 pt-1.5">
                  <span className="text-adm-text-secondary">İndirimli kar marjı</span>
                  <span
                    className={`font-medium ${(discountedMarginPercent ?? 0) < 0 ? "text-adm-danger" : "text-adm-text"}`}
                  >
                    %{(discountedMarginPercent ?? 0).toFixed(1)}
                  </span>
                </div>
              )}
              {(marginPercent ?? 0) < 0 && (
                <p className="text-xs text-adm-danger">
                  Maliyet satış fiyatını aşıyor — negatif marj. Kaydetmeyi engellemez.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={activeSection === "inventory" ? "space-y-4" : "hidden"}>
          <SectionTitle>Stok</SectionTitle>
          <Field label="Ana stok">
            <input
              placeholder="Stok"
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          </Field>
          <Field label="Kritik stok eşiği">
            <input
              placeholder="Kritik stok eşiği"
              type="number"
              min="0"
              required
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          </Field>
          <p className="text-xs text-adm-text-tertiary">
            Stok bu eşiğin altına düştüğünde ürün Stok Takibi sayfasında kritik olarak işaretlenir.
          </p>
          {variants.length > 0 && (
            <p className="text-xs text-adm-text-tertiary">
              Bu ürünün {variants.length} varyantı var — her varyantın kendi stoğu Varyantlar bölümünden yönetilir.
            </p>
          )}
        </div>

        <div className={activeSection === "cosmetic" ? "space-y-6" : "hidden"}>
          <SectionTitle>Kozmetik Detaylar</SectionTitle>
          <div>
            <p className="mb-2 text-xs text-adm-text-secondary">Cilt Tipi</p>
            <div className="flex flex-wrap gap-2">
              {SKIN_TYPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => toggleInList(skinTypes, setSkinTypes, option)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    skinTypes.includes(option)
                      ? "border-adm-primary bg-adm-primary text-white"
                      : "border-adm-border text-adm-text-secondary hover:border-adm-text-tertiary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-adm-text-secondary">Cilt Sorunu</p>
            <div className="flex flex-wrap gap-2">
              {SKIN_CONCERN_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => toggleInList(skinConcerns, setSkinConcerns, option)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    skinConcerns.includes(option)
                      ? "border-adm-primary bg-adm-primary text-white"
                      : "border-adm-border text-adm-text-secondary hover:border-adm-text-tertiary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Bitiş (Finish)">
              <select value={finish} onChange={(e) => setFinish(e.target.value)} className={inputClass}>
                <option value="">Seçilmedi</option>
                {FINISH_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Kapatıcılık">
              <select value={coverage} onChange={(e) => setCoverage(e.target.value)} className={inputClass}>
                <option value="">Seçilmedi</option>
                {COVERAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Doku">
              <select value={texture} onChange={(e) => setTexture(e.target.value)} className={inputClass}>
                <option value="">Seçilmedi</option>
                {TEXTURE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5 text-sm text-adm-text">
              <input type="checkbox" checked={isVegan} onChange={(e) => setIsVegan(e.target.checked)} className="accent-adm-primary" />
              Vegan
            </label>
            <label className="flex items-center gap-1.5 text-sm text-adm-text">
              <input type="checkbox" checked={isCrueltyFree} onChange={(e) => setIsCrueltyFree(e.target.checked)} className="accent-adm-primary" />
              Cruelty-Free
            </label>
            <label className="flex items-center gap-1.5 text-sm text-adm-text">
              <input type="checkbox" checked={isParabenFree} onChange={(e) => setIsParabenFree(e.target.checked)} className="accent-adm-primary" />
              Paraben İçermez
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="SPF">
              <input placeholder="SPF" type="number" min="0" max="100" value={spf} onChange={(e) => setSpf(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Hacim">
              <input placeholder="örn. 50 ml" value={volumeLabel} onChange={(e) => setVolumeLabel(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Menşei">
              <input placeholder="örn. Fransa" value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass} />
            </Field>
            <Field label="SKT / PAO">
              <input placeholder="örn. 12 ay" value={expiryInfo} onChange={(e) => setExpiryInfo(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Kullanım amacı">
            <input placeholder="örn. Nemlendirme" value={usagePurpose} onChange={(e) => setUsagePurpose(e.target.value)} className={inputClass} />
          </Field>
          <Field label="İçindekiler / INCI listesi">
            <textarea placeholder="İçindekiler / INCI listesi" rows={3} value={fullIngredients} onChange={(e) => setFullIngredients(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Kullanım talimatı">
            <textarea placeholder="Kullanım talimatı" rows={2} value={usageInstructions} onChange={(e) => setUsageInstructions(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Uyarılar">
            <textarea placeholder="Uyarılar" rows={2} value={warnings} onChange={(e) => setWarnings(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className={activeSection === "ingredients" ? "" : "hidden"}>
          <SectionTitle>Aktif İçerikler</SectionTitle>
          {ingredients.length === 0 ? (
            <p className="text-xs text-adm-text-tertiary">
              Henüz aktif içerik tanımlanmadı — İçerikler sayfasından ekleyebilirsiniz.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient) => (
                <button
                  type="button"
                  key={ingredient.id}
                  onClick={() => toggleInList(ingredientIds, setIngredientIds, ingredient.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    ingredientIds.includes(ingredient.id)
                      ? "border-adm-primary bg-adm-primary text-white"
                      : "border-adm-border text-adm-text-secondary hover:border-adm-text-tertiary"
                  }`}
                >
                  {ingredient.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={activeSection === "seo" ? "space-y-4" : "hidden"}>
          <SectionTitle>SEO &amp; Yayın Durumu</SectionTitle>
          <Field label="SEO başlığı">
            <input placeholder="SEO başlığı (opsiyonel)" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label="SEO tanımı">
            <textarea placeholder="SEO tanımı (opsiyonel)" rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Yayın durumu">
            <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")} className={`${inputClass} max-w-xs`}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="mt-6 text-xs text-adm-danger">{error}</p>}
        <div className="mt-8 flex items-center gap-3 border-t border-adm-border pt-6">
          <AdminButton type="submit" disabled={submitting}>
            {submitting ? "Kaydediliyor…" : productId ? "Güncelle" : "Oluştur"}
          </AdminButton>
        </div>
      </form>

      {/* Live storefront preview */}
      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-tertiary">
            Canlı Mağaza Önizlemesi
          </p>
          <div className="border border-adm-border p-4">
            <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-adm-surface-secondary">
              {thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                />
              )}
              {isNew && (
                <span className="absolute left-2 top-2 rounded-full bg-adm-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Yeni
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-adm-text-tertiary">
              {brandName ?? categoryLabel ?? "Kategori"}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-adm-text">{title || "Ürün adı"}</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-adm-text">{formatPrice(discounted || 0)}</span>
              {Number(discountPercentage) > 0 && (
                <span className="text-xs text-adm-text-tertiary line-through">{formatPrice(Number(price) || 0)}</span>
              )}
            </div>
            {variants.length > 0 && (
              <div className="mt-3 flex gap-1.5">
                {variants.map((v, i) => {
                  const color = colors.find((c) => c.id === v.colorId);
                  const size = sizes.find((s) => s.id === v.sizeId);
                  return (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-adm-border"
                      style={{ backgroundColor: color?.hex ?? "#e8e3df" }}
                      title={size && color ? `${size.label} / ${color.name}` : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
