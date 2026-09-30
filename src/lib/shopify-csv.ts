import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/slugify";

// Shopify's product CSV, both ways. Pure: our products in → rows out, and
// a CSV in → validated products out. The database side is in
// src/lib/shopify-import.ts.
//
// Shopify's format: one row per variant, rows of one product share a URL
// handle, the first row carries the product's own fields, extra images get
// rows of their own. Variants are defined by up to three options; ours are
// always colour × size, so we write Option1 = Renk, Option2 = Beden and on
// import recognise those option names (Turkish or English).

// ── Export ────────────────────────────────────────────────────────────────

export const SHOPIFY_HEADERS = [
  "Title",
  "URL handle",
  "Description",
  "Vendor",
  "Type",
  "Tags",
  "Published on online store",
  "Status",
  "SKU",
  "Option1 name",
  "Option1 value",
  "Option2 name",
  "Option2 value",
  "Price",
  "Compare-at price",
  "Cost per item",
  "Charge tax",
  "Inventory tracker",
  "Inventory quantity",
  "Requires shipping",
  "Product image URL",
  "Image position",
  "Image alt text",
  "SEO title",
  "SEO description",
] as const;

export type ExportProduct = {
  id: number;
  title: string;
  description: string;
  vendor: string | null;
  type: string;
  tags: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  price: number;
  discountPercentage: number;
  cost: number | null;
  stock: number;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; alt: string | null }[];
  variants: { sku: string; color: string; size: string; stock: number; priceOverride: number | null }[];
};

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// Our descriptions are plain text; Shopify's are HTML.
export function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((para) => `<p>${para.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

export const productHandle = (p: { id: number; title: string }) => `${slugify(p.title)}-${p.id}`;

export function productsToShopifyRows(products: ExportProduct[], absoluteUrl: (path: string) => string) {
  const rows: string[][] = [[...SHOPIFY_HEADERS]];
  for (const p of products) {
    const handle = productHandle(p);
    const hasVariants = p.variants.length > 0;
    const variants = hasVariants
      ? p.variants
      : [{ sku: "", color: "", size: "", stock: p.stock, priceOverride: null }];
    const count = Math.max(variants.length, p.images.length);

    for (let i = 0; i < count; i++) {
      const row: Record<(typeof SHOPIFY_HEADERS)[number], string> = Object.fromEntries(
        SHOPIFY_HEADERS.map((h) => [h, ""])
      ) as Record<(typeof SHOPIFY_HEADERS)[number], string>;
      row["URL handle"] = handle;

      if (i === 0) {
        row.Title = p.title;
        row.Description = textToHtml(p.description);
        row.Vendor = p.vendor ?? "";
        row.Type = p.type;
        row.Tags = p.tags.join(", ");
        row["Published on online store"] = p.status === "ACTIVE" ? "TRUE" : "FALSE";
        row.Status = p.status.toLowerCase();
        row["SEO title"] = p.seoTitle ?? "";
        row["SEO description"] = p.seoDescription ?? "";
        row["Option1 name"] = hasVariants ? "Renk" : "Title";
        if (hasVariants) row["Option2 name"] = "Beden";
      }

      const v = variants[i];
      if (v) {
        const base = v.priceOverride ?? p.price;
        row.SKU = v.sku;
        row["Option1 value"] = hasVariants ? v.color : "Default Title";
        if (hasVariants) row["Option2 value"] = v.size;
        row.Price = money(base * (1 - p.discountPercentage / 100));
        row["Compare-at price"] = p.discountPercentage > 0 ? money(base) : "";
        row["Cost per item"] = p.cost !== null ? money(p.cost) : "";
        row["Charge tax"] = "TRUE";
        row["Inventory tracker"] = "shopify";
        row["Inventory quantity"] = String(v.stock);
        row["Requires shipping"] = "TRUE";
      }

      const img = p.images[i];
      if (img) {
        row["Product image URL"] = img.url.startsWith("/") ? absoluteUrl(img.url) : img.url;
        row["Image position"] = String(i + 1);
        row["Image alt text"] = img.alt ?? "";
      }
      rows.push(SHOPIFY_HEADERS.map((h) => row[h]));
    }
  }
  return rows;
}

// ── Import ────────────────────────────────────────────────────────────────

export const MAX_IMPORT_ROWS = 5000;

// Current Shopify column names first, then the older ones Shopify still
// accepts (and many apps still write). Matched case-insensitively.
const COLUMNS = {
  handle: ["URL handle", "Handle"],
  title: ["Title"],
  description: ["Description", "Body (HTML)"],
  vendor: ["Vendor"],
  type: ["Type"],
  tags: ["Tags"],
  status: ["Status"],
  sku: ["SKU", "Variant SKU"],
  option1Name: ["Option1 name"],
  option1Value: ["Option1 value"],
  option2Name: ["Option2 name"],
  option2Value: ["Option2 value"],
  option3Name: ["Option3 name"],
  option3Value: ["Option3 value"],
  price: ["Price", "Variant Price"],
  compareAt: ["Compare-at price", "Variant Compare At Price"],
  cost: ["Cost per item"],
  stock: ["Inventory quantity", "Variant Inventory Qty"],
  image: ["Product image URL", "Image Src"],
  imagePosition: ["Image position"],
  imageAlt: ["Image alt text"],
  seoTitle: ["SEO title"],
  seoDescription: ["SEO description"],
} as const;
type Column = keyof typeof COLUMNS;

const COLOR_OPTION = /^(renk|color|colour)$/i;
const SIZE_OPTION = /^(beden|size|numara)$/i;

export type ParsedVariant = {
  color: string | null;
  size: string | null;
  sku: string;
  price: number;
  compareAt: number | null;
  cost: number | null;
  stock: number;
};

export type ParsedProduct = {
  handle: string;
  line: number; // the product's first line in the file (header is line 1)
  title: string;
  description: string;
  vendor: string | null;
  type: string | null;
  tags: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  seoTitle: string | null;
  seoDescription: string | null;
  hasOptions: boolean;
  variants: ParsedVariant[];
  images: { url: string; alt: string | null; position: number }[];
  errors: string[];
  warnings: string[];
};

export type ParseResult = { products: ParsedProduct[]; errors: string[] };

// Shopify descriptions are HTML; ours are plain text with line breaks.
export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// "1.290,50" or "1290.50" → 1290.5; blank → null; anything else → NaN.
export function parseMoney(value: string): number | null {
  const s = value.trim().replace(/\s|₺|TL/gi, "");
  if (!s) return null;
  const normalized = /,\d{1,2}$/.test(s) ? s.replaceAll(".", "").replace(",", ".") : s.replaceAll(",", "");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

export function parseShopifyCsv(text: string): ParseResult {
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (err) {
    return { products: [], errors: [err instanceof Error ? err.message : "CSV okunamadı."] };
  }
  if (rows.length < 2) return { products: [], errors: ["Dosyada başlık satırından sonra veri yok."] };
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { products: [], errors: [`En fazla ${MAX_IMPORT_ROWS} satır içe aktarılabilir (dosyada ${rows.length - 1}).`] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const index = Object.fromEntries(
    (Object.keys(COLUMNS) as Column[]).map((key) => [
      key,
      COLUMNS[key].map((name) => header.indexOf(name.toLowerCase())).find((i) => i >= 0) ?? -1,
    ])
  ) as Record<Column, number>;
  if (index.title < 0) return { products: [], errors: ['"Title" sütunu bulunamadı — bu bir Shopify ürün CSV\'si mi?'] };

  const byHandle = new Map<string, { line: number; cells: Record<Column, string> }[]>();
  const errors: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const cells = Object.fromEntries(
      (Object.keys(COLUMNS) as Column[]).map((key) => [key, index[key] >= 0 ? (r[index[key]] ?? "").trim() : ""])
    ) as Record<Column, string>;
    const handle = cells.handle || slugify(cells.title);
    if (!handle) {
      errors.push(`Satır ${i + 2}: URL handle ya da başlık yok.`);
      return;
    }
    if (!byHandle.has(handle)) byHandle.set(handle, []);
    byHandle.get(handle)!.push({ line: i + 2, cells });
  });

  const products = [...byHandle.entries()].map(([handle, group]) => parseProduct(handle, group));

  // A SKU belongs to one variant in the whole file.
  const skuOwner = new Map<string, string>();
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.sku) continue;
      const owner = skuOwner.get(v.sku);
      if (owner && owner !== p.handle) p.errors.push(`SKU "${v.sku}" dosyada başka bir üründe de var (${owner}).`);
      skuOwner.set(v.sku, p.handle);
    }
  }
  return { products, errors };
}

function parseProduct(handle: string, group: { line: number; cells: Record<Column, string> }[]): ParsedProduct {
  const first = group[0].cells;
  const errors: string[] = [];
  const warnings: string[] = [];

  const status = (first.status || "active").toLowerCase();
  const product: ParsedProduct = {
    handle,
    line: group[0].line,
    title: first.title,
    description: htmlToText(first.description),
    vendor: first.vendor || null,
    type: first.type || null,
    tags: first.tags ? first.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    status: status === "draft" ? "DRAFT" : status === "archived" ? "ARCHIVED" : "ACTIVE",
    seoTitle: first.seoTitle || null,
    seoDescription: first.seoDescription || null,
    hasOptions: false,
    variants: [],
    images: [],
    errors,
    warnings,
  };
  if (!product.title) errors.push("Başlık (Title) boş.");
  if (!["active", "draft", "archived"].includes(status)) warnings.push(`Bilinmeyen durum "${first.status}" — yayında sayıldı.`);

  // Which option is colour, which is size. "Title" / "Default Title" is
  // Shopify's way of saying "no options".
  const names = [first.option1Name, first.option2Name, first.option3Name];
  const noOptions = !names[0] || (names[0].toLowerCase() === "title" && !names[1]);
  let colorAt = -1;
  let sizeAt = -1;
  if (!noOptions) {
    names.forEach((name, i) => {
      if (!name) return;
      if (COLOR_OPTION.test(name)) colorAt = i;
      else if (SIZE_OPTION.test(name)) sizeAt = i;
      else errors.push(`Desteklenmeyen seçenek "${name}" — yalnızca renk ve beden seçenekleri aktarılabilir.`);
    });
    product.hasOptions = colorAt >= 0 || sizeAt >= 0;
  }

  const seen = new Set<string>();
  for (const { line, cells } of group) {
    const values = [cells.option1Value, cells.option2Value, cells.option3Value];
    const isVariantRow = Boolean(cells.sku || cells.price || values.some(Boolean));
    if (isVariantRow) {
      const price = parseMoney(cells.price);
      const compareAt = parseMoney(cells.compareAt);
      const cost = parseMoney(cells.cost);
      const stock = cells.stock ? Number(cells.stock) : 0;
      if (price === null || Number.isNaN(price) || price <= 0) errors.push(`Satır ${line}: geçerli bir fiyat (Price) yok.`);
      if (Number.isNaN(compareAt)) errors.push(`Satır ${line}: indirim öncesi fiyat (Compare-at price) sayı değil.`);
      if (Number.isNaN(cost)) errors.push(`Satır ${line}: maliyet (Cost per item) sayı değil.`);
      if (!Number.isInteger(stock) || stock < 0) errors.push(`Satır ${line}: stok (Inventory quantity) 0 ya da pozitif tam sayı olmalı.`);
      const variant: ParsedVariant = {
        color: colorAt >= 0 ? values[colorAt] || null : null,
        size: sizeAt >= 0 ? values[sizeAt] || null : null,
        sku: cells.sku,
        price: price ?? 0,
        // A compare-at price at or below the price isn't a discount.
        compareAt: compareAt !== null && !Number.isNaN(compareAt) && price !== null && compareAt > price ? compareAt : null,
        cost: cost !== null && !Number.isNaN(cost) ? cost : null,
        stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
      };
      if (product.hasOptions) {
        const key = `${variant.color ?? ""}|${variant.size ?? ""}`;
        if (seen.has(key)) errors.push(`Satır ${line}: aynı renk/beden (${variant.color ?? "—"} / ${variant.size ?? "—"}) iki kez var.`);
        seen.add(key);
      }
      product.variants.push(variant);
    }
    if (cells.image) {
      // Which addresses can actually be used is decided on import (our own
      // site's images are reused, others must be https).
      if (!/^https?:\/\//i.test(cells.image)) {
        warnings.push(`Satır ${line}: görsel adresi geçersiz, atlanacak.`);
      } else if (!product.images.some((img) => img.url === cells.image)) {
        const position = Number(cells.imagePosition);
        product.images.push({
          url: cells.image,
          alt: cells.imageAlt || null,
          position: Number.isInteger(position) && position > 0 ? position : product.images.length + 1,
        });
      }
    }
  }
  product.images.sort((a, b) => a.position - b.position);

  if (product.variants.length === 0) errors.push("Fiyatı olan bir satır (varyant) yok.");
  if (!product.hasOptions && product.variants.length > 1) {
    errors.push("Seçeneği olmayan üründe birden fazla varyant satırı var.");
  }
  return product;
}

// Our pricing is one base price + one discount % per product, with an
// optional per-variant base price. Shopify has price + compare-at price per
// variant. The first variant sets the product's base and discount; a
// variant with another base price gets an override.
export function planPricing(variants: ParsedVariant[]) {
  const base = (v: ParsedVariant) => v.compareAt ?? v.price;
  const discountOf = (v: ParsedVariant) => (v.compareAt ? (1 - v.price / v.compareAt) * 100 : 0);
  const first = variants[0];
  const price = base(first);
  const discountPercentage = Math.round(discountOf(first) * 100) / 100;
  const warnings: string[] = [];
  if (variants.some((v) => Math.abs(discountOf(v) - discountPercentage) > 0.5)) {
    warnings.push(`Varyantların indirim oranları farklı; tüm ürüne %${discountPercentage} indirim uygulanacak.`);
  }
  const costs = new Set(variants.map((v) => v.cost));
  if (costs.size > 1) warnings.push("Varyant maliyetleri farklı; ürün maliyeti olarak ilk varyantınki kullanılacak.");
  return {
    price,
    discountPercentage,
    cost: first.cost,
    overrides: variants.map((v) => (Math.abs(base(v) - price) >= 0.01 ? base(v) : null)),
    warnings,
  };
}
