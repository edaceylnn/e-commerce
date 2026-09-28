// Pure filter/sort/facet math for the category listing page. No DB access —
// operates on a Product[] already fetched for one category, same reasoning
// as src/lib/shipping.ts and src/lib/coupons.ts (safe from Server or Client).
import type { Product } from "@/lib/products";

export type ProductFilters = {
  brands: string[];
  types: string[];
  skinTypes: string[];
  /** Size labels ("M") — matches a product with an in-stock variant in that size. */
  sizes: string[];
  /** Colour names ("Krem") — matches a product with a variant in that colour. */
  colors: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly: boolean;
};

export const SORT_OPTIONS = [
  { value: "onerilen", label: "Önerilen" },
  { value: "newest", label: "En yeni" },
  { value: "price-asc", label: "Fiyat: Artan" },
  { value: "price-desc", label: "Fiyat: Azalan" },
  { value: "rating", label: "En yüksek puan" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"] | "bestseller" | "discount";

// "Ürün tipi" options come from product tags; show them as readable labels.
const TYPE_LABELS: Record<string, string> = { indirim: "İndirimde" };
export function typeLabel(tag: string): string {
  return TYPE_LABELS[tag] ?? tag.charAt(0).toLocaleUpperCase("tr-TR") + tag.slice(1);
}

export function effectivePrice(product: Product): number {
  return product.price * (1 - product.discountPercentage / 100);
}

// Accepts both the shape a native <form method="GET"> with repeated
// checkbox names produces (string[], via Next's searchParams) and a single
// comma-joined string (e.g. a hand-built filter link) for flexibility.
function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(",");
  return parts.filter(Boolean);
}

export function parseFilters(searchParams: {
  brand?: string | string[];
  type?: string | string[];
  skinType?: string | string[];
  size?: string | string[];
  color?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  inStock?: string;
}): ProductFilters {
  return {
    brands: toList(searchParams.brand),
    types: toList(searchParams.type),
    skinTypes: toList(searchParams.skinType),
    sizes: toList(searchParams.size),
    colors: toList(searchParams.color),
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    minRating: searchParams.rating ? Number(searchParams.rating) : undefined,
    inStockOnly: searchParams.inStock === "1",
  };
}


export function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((p) => {
    if (filters.brands.length > 0 && (!p.brandSlug || !filters.brands.includes(p.brandSlug))) {
      return false;
    }
    if (filters.types.length > 0 && !p.tags.some((t) => filters.types.includes(t))) {
      return false;
    }
    if (
      filters.skinTypes.length > 0 &&
      !p.skinTypes.some((t) => filters.skinTypes.includes(t))
    ) {
      return false;
    }
    if (
      filters.sizes.length > 0 &&
      !p.variants.some((v) => v.stock > 0 && filters.sizes.includes(v.sizeLabel))
    ) {
      return false;
    }
    if (filters.colors.length > 0 && !p.variants.some((v) => filters.colors.includes(v.colorName))) {
      return false;
    }
    const price = effectivePrice(p);
    if (filters.minPrice !== undefined && price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
    if (filters.minRating !== undefined && p.rating < filters.minRating) return false;
    if (filters.inStockOnly && p.stock <= 0) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-desc":
      return list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "discount":
      return list.sort((a, b) => b.discountPercentage - a.discountPercentage);
    case "rating":
    case "bestseller":
      return list.sort((a, b) => b.rating - a.rating);
    case "newest":
      return list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.id - a.id);
    default:
      return list;
  }
}

export type Facets = {
  brands: { slug: string; label: string; count: number }[];
  types: { value: string; count: number }[];
  skinTypes: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  colors: { value: string; hex: string; count: number }[];
  priceMin: number;
  priceMax: number;
};

// Computed from the category's full, unfiltered product list so the
// available options never disappear as the visitor narrows results.
export function computeFacets(products: Product[]): Facets {
  const brandCounts = new Map<string, { label: string; count: number }>();
  const typeCounts = new Map<string, number>();
  const skinTypeCounts = new Map<string, number>();
  // Map insertion order = first-seen variant order, which keeps sizes in
  // their natural XS→XL sequence (variants are position-ordered).
  const sizeCounts = new Map<string, number>();
  const colorCounts = new Map<string, { hex: string; count: number }>();
  let priceMin = Infinity;
  let priceMax = 0;

  for (const p of products) {
    if (p.brandSlug && p.brand) {
      const entry = brandCounts.get(p.brandSlug) ?? { label: p.brand, count: 0 };
      entry.count += 1;
      brandCounts.set(p.brandSlug, entry);
    }
    for (const tag of p.tags) {
      typeCounts.set(tag, (typeCounts.get(tag) ?? 0) + 1);
    }
    for (const skinType of p.skinTypes) {
      skinTypeCounts.set(skinType, (skinTypeCounts.get(skinType) ?? 0) + 1);
    }
    for (const size of new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.sizeLabel))) {
      sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
    }
    const seenColors = new Set<string>();
    for (const v of p.variants) {
      if (seenColors.has(v.colorName)) continue;
      seenColors.add(v.colorName);
      const entry = colorCounts.get(v.colorName) ?? { hex: v.colorHex, count: 0 };
      entry.count += 1;
      colorCounts.set(v.colorName, entry);
    }
    const price = effectivePrice(p);
    priceMin = Math.min(priceMin, price);
    priceMax = Math.max(priceMax, price);
  }

  return {
    brands: [...brandCounts.entries()]
      .map(([slug, { label, count }]) => ({ slug, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr")),
    types: [...typeCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    skinTypes: [...skinTypeCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    sizes: [...sizeCounts.entries()].map(([value, count]) => ({ value, count })),
    colors: [...colorCounts.entries()].map(([value, { hex, count }]) => ({ value, hex, count })),
    priceMin: Number.isFinite(priceMin) ? Math.floor(priceMin) : 0,
    priceMax: Math.ceil(priceMax),
  };
}

export const EMPTY_FILTERS: ProductFilters = {
  brands: [],
  types: [],
  skinTypes: [],
  sizes: [],
  colors: [],
  inStockOnly: false,
};

/** Non-filter listing params carried across every filter/sort change. */
export type ListingContext = { category?: string; q?: string; filter?: string; sort?: string };

// The listing URL for a context + filter set — used by the server page for
// "remove this filter" links and by the client drawer/sort menu, so the
// query-string shape parseFilters() reads is built in exactly one place.
export function listingHref(ctx: ListingContext, f: ProductFilters): string {
  const params = new URLSearchParams();
  if (ctx.category) params.set("category", ctx.category);
  if (ctx.q) params.set("q", ctx.q);
  if (ctx.filter) params.set("filter", ctx.filter);
  if (ctx.sort) params.set("sort", ctx.sort);
  f.brands.forEach((b) => params.append("brand", b));
  f.types.forEach((t) => params.append("type", t));
  f.skinTypes.forEach((st) => params.append("skinType", st));
  f.sizes.forEach((s) => params.append("size", s));
  f.colors.forEach((c) => params.append("color", c));
  if (f.minPrice !== undefined) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== undefined) params.set("maxPrice", String(f.maxPrice));
  if (f.minRating !== undefined) params.set("rating", String(f.minRating));
  if (f.inStockOnly) params.set("inStock", "1");
  const qs = params.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

/** Filter groups counted for the "Filtre (n)" label. */
export function activeFilterCount(f: ProductFilters): number {
  return (
    f.types.length +
    f.sizes.length +
    f.colors.length +
    (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0) +
    (f.inStockOnly ? 1 : 0)
  );
}
