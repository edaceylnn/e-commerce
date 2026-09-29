"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { auditProduct, META_DESCRIPTION_MAX } from "@/lib/product-audit";
import { AdminButton } from "@/components/admin/Button";
import { Card } from "@/components/admin/Card";
import { ProductAuditPanel } from "@/components/admin/ProductAuditPanel";
import { ProductDraftsPanel, type PendingDraft } from "@/components/admin/ProductDraftsPanel";
import { PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { TrashIcon } from "@/components/icons/AdminIcons";

const inputClass =
  "w-full rounded-md border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary";

const STATUS_OPTIONS: { value: "DRAFT" | "ACTIVE" | "ARCHIVED"; label: string }[] = [
  { value: "DRAFT", label: "Taslak (mağazada görünmez)" },
  { value: "ACTIVE", label: "Yayında" },
  { value: "ARCHIVED", label: "Arşiv" },
];

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
  facts?: string;
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

// Fields this simplified form no longer shows (pricing extras, brand, legacy
// cosmetic attributes…). They're sent back exactly as loaded so saving here
// never wipes data entered elsewhere or before the simplification.
function preservedFields(initial: AdminProductInitial | undefined, defaultLowStockThreshold: number) {
  return {
    discountPercentage: initial?.discountPercentage ?? 0,
    cost: initial?.cost,
    taxRate: initial?.taxRate ?? 20,
    lowStockThreshold: initial?.lowStockThreshold ?? defaultLowStockThreshold,
    brandId: initial?.brandId,
    sizeChartId: initial?.sizeChartId,
    tags: initial?.tags ?? [],
    isNew: initial?.isNew ?? false,
    skinTypes: initial?.skinTypes ?? [],
    skinConcerns: initial?.skinConcerns ?? [],
    finish: initial?.finish,
    coverage: initial?.coverage,
    texture: initial?.texture,
    usagePurpose: initial?.usagePurpose,
    fullIngredients: initial?.fullIngredients,
    usageInstructions: initial?.usageInstructions,
    warnings: initial?.warnings,
    isVegan: initial?.isVegan ?? false,
    isCrueltyFree: initial?.isCrueltyFree ?? false,
    isParabenFree: initial?.isParabenFree ?? false,
    spf: initial?.spf,
    volumeLabel: initial?.volumeLabel,
    origin: initial?.origin,
    expiryInfo: initial?.expiryInfo,
    ingredientIds: initial?.ingredientIds ?? [],
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs text-adm-text-secondary">
        <span>{label}</span>
        {hint && <span className="text-adm-text-tertiary">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function AdminProductForm({
  productId,
  initial,
  colors,
  sizes,
  pendingDrafts = [],
  defaultLowStockThreshold = 10,
}: {
  productId?: number;
  initial?: AdminProductInitial;
  colors: { id: string; name: string; hex: string }[];
  sizes: { id: string; label: string }[];
  pendingDrafts?: PendingDraft[];
  // Admin-configurable via Ayarlar (Bölüm 40) — only used to prefill a
  // brand-new product's threshold; an existing product keeps its own value.
  defaultLowStockThreshold?: number;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [facts, setFacts] = useState(initial?.facts ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? PRODUCT_CATEGORIES[0].slug);
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "0");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [images, setImages] = useState<AdminProductImageInitial[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [variants, setVariants] = useState<AdminProductVariantInitial[]>(initial?.variants ?? []);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(initial?.status ?? "DRAFT");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const audit = useMemo(
    () =>
      auditProduct({
        title,
        description,
        categorySlug,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        metaTitle,
        metaDescription,
        images,
        variants,
      }),
    [title, description, categorySlug, price, stock, metaTitle, metaDescription, images, variants]
  );

  function addVariant() {
    const last = variants[variants.length - 1];
    setVariants((prev) => [
      ...prev,
      // Adding sizes one after another for the same color is the common case.
      { colorId: last?.colorId ?? colors[0]?.id ?? "", sizeId: sizes[0]?.id ?? "", sku: "", stock: 0 },
    ]);
  }

  function updateVariant(index: number, patch: Partial<AdminProductVariantInitial>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function addImageUrl(url: string) {
    setImages((prev) => [...prev, { url }]);
    // The first photo becomes the cover unless one is already set.
    setThumbnail((prev) => prev || url);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    const errors: string[] = [];
    // One by one, so each photo appears as soon as it's stored and one bad
    // file doesn't block the rest.
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (res?.ok && data?.url) addImageUrl(data.url);
      else errors.push(data?.error ?? `${file.name}: yüklenemedi.`);
    }
    setUploading(false);
    if (errors.length) setUploadError(errors.join(" "));
  }

  function updateImage(index: number, patch: Partial<AdminProductImageInitial>) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  }

  function removeImage(index: number) {
    const removed = images[index];
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    // The cover image can't point at a photo that no longer exists — the
    // next remaining one takes over automatically (PRD edge case).
    if (removed?.url === thumbnail) setThumbnail(next[0]?.url ?? "");
  }

  function applyApprovedDraft(draft: PendingDraft, text: string, preservedFacts?: string) {
    if (preservedFacts) setFacts(preservedFacts);
    if (draft.kind === "SHORT_DESCRIPTION") setDescription(text);
    else if (draft.kind === "META_TITLE") setMetaTitle(text);
    else if (draft.kind === "META_DESCRIPTION") setMetaDescription(text);
    else setImages((prev) => prev.map((img) => (img.url === draft.imageUrl ? { ...img, altText: text } : img)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const payload = {
      ...preservedFields(initial, defaultLowStockThreshold),
      title,
      description,
      facts,
      categorySlug,
      price: Number(price),
      stock: Number(stock),
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
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      status,
    };

    const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Kaydedilemedi.");
      return;
    }

    if (productId) {
      setSaved(true);
      router.refresh();
    } else {
      // Straight into the edit screen, where the AI drafts become available.
      router.push(`/admin/products/${data.id}/edit`);
    }
  }

  const variantStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
        <Card title="Temel bilgiler">
          <div className="space-y-4">
            <Field label="Ürün adı">
              <input
                placeholder="örn. Yüksek Bel Toparlayıcı Spor Tayt"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kategori">
                <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={inputClass}>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fiyat (₺)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Yayın durumu">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Ürün bilgileri" hint="Müşteriye gösterilmez · AI taslakları bundan yazılır">
              <textarea
                placeholder={"Kumaş: %78 polyamid, %22 elastan\nKalıp: yüksek bel, ispanyol paça\nBakım: 30°C'de yıkayın"}
                rows={4}
                value={facts}
                onChange={(e) => setFacts(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Açıklama" hint={`Mağazada görünen metin · ${description.length} karakter`}>
              <textarea
                placeholder="Müşterinin ürün sayfasında okuyacağı metin. AI taslağı onaylanınca buraya yazılır."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="Beden, renk ve stok">
          {colors.length === 0 || sizes.length === 0 ? (
            <p className="mb-3 text-xs text-adm-danger">
              Varyant eklemeden önce en az bir renk ve bir beden tanımlanmış olmalı.
            </p>
          ) : null}
          {variants.length > 0 && (
            <div className="mb-2 hidden grid-cols-[1fr_90px_1fr_90px_36px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-adm-text-tertiary sm:grid">
              <span>Renk</span>
              <span>Beden</span>
              <span>SKU</span>
              <span>Stok</span>
              <span />
            </div>
          )}
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div
                key={variant.id ?? `new-${index}`}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_1fr_90px_36px] sm:items-center"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-adm-border"
                    style={{ backgroundColor: colors.find((c) => c.id === variant.colorId)?.hex ?? "#e8e3df" }}
                  />
                  <select
                    required
                    aria-label="Renk"
                    value={variant.colorId}
                    onChange={(e) => updateVariant(index, { colorId: e.target.value })}
                    className={inputClass}
                  >
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  required
                  aria-label="Beden"
                  value={variant.sizeId}
                  onChange={(e) => updateVariant(index, { sizeId: e.target.value })}
                  className={inputClass}
                >
                  {sizes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="SKU"
                  aria-label="SKU"
                  required
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  aria-label="Stok"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  aria-label="Varyantı sil"
                  className="inline-flex justify-center rounded-md p-2 text-adm-danger transition hover:bg-adm-danger-soft"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-1 text-sm font-medium text-adm-primary hover:underline"
            >
              <PlusIcon className="h-4 w-4" /> Beden / renk ekle
            </button>
            {variants.length > 0 ? (
              <p className="text-xs text-adm-text-tertiary">Toplam stok: {variantStock}</p>
            ) : (
              <label className="flex items-center gap-2 text-xs text-adm-text-secondary">
                Varyantsız stok
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`${inputClass} w-24 py-1.5`}
                />
              </label>
            )}
          </div>
        </Card>

        <Card title="Görseller">
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-adm-border px-4 py-2.5 text-sm font-semibold text-adm-text transition hover:border-adm-text-tertiary hover:bg-adm-surface-secondary ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              {uploading ? "Yükleniyor…" : "Bilgisayardan yükle"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-adm-text-tertiary">JPG, PNG, WebP veya GIF · en fazla 5 MB</span>
          </div>
          {uploadError && <p className="mt-2 text-xs text-adm-danger">{uploadError}</p>}

          <div className="mt-3 space-y-2">
            {images.map((img, index) => (
              <div
                key={`${img.url}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-adm-border p-3"
              >
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
                    placeholder="Alt metin — görselde ne var? (örn. Siyah spor tayt, yandan görünüm)"
                    value={img.altText ?? ""}
                    onChange={(e) => updateImage(index, { altText: e.target.value })}
                    className={`${inputClass} py-1.5 text-xs ${img.altText?.trim() ? "" : "border-adm-warning"}`}
                  />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setThumbnail(img.url)}
                    disabled={thumbnail === img.url}
                    className="text-xs font-medium text-adm-primary hover:underline disabled:text-adm-text-tertiary disabled:no-underline"
                  >
                    {thumbnail === img.url ? "Kapak" : "Kapak yap"}
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
        </Card>

        <Card title="Arama motoru (SEO)">
          <div className="space-y-4">
            <Field label="SEO başlığı" hint="Boşsa ürün adı kullanılır">
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field
              label="Meta açıklama"
              hint={
                <span className={metaDescription.length > META_DESCRIPTION_MAX ? "text-adm-danger" : undefined}>
                  {metaDescription.length}/{META_DESCRIPTION_MAX}
                </span>
              }
            >
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <AdminButton type="submit" loading={submitting}>
            {productId ? "Kaydet" : "Ürünü oluştur"}
          </AdminButton>
          {saved && <span className="text-sm text-adm-success">Kaydedildi.</span>}
          {error && <span className="text-sm text-adm-danger">{error}</span>}
        </div>
      </form>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <ProductAuditPanel result={audit} />
        <ProductDraftsPanel
          productId={productId}
          initialDrafts={pendingDrafts}
          getSource={() => ({
            title,
            categorySlug,
            description,
            facts,
            price: Number(price) || 0,
            colorIds: [...new Set(variants.map((v) => v.colorId))],
            sizeIds: [...new Set(variants.map((v) => v.sizeId))],
            images: images.map((img) => ({ url: img.url, altText: img.altText })),
          })}
          onApproved={applyApprovedDraft}
        />
      </aside>
    </div>
  );
}
