// The listing's filter/sort vocabulary and URL shape — parsed from and
// written back to the query string. Pure (safe from Server or Client); the
// filtering, counting and sorting itself runs in the database, see
// src/lib/catalog.ts.

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

export type Facets = {
  brands: { slug: string; label: string; count: number }[];
  types: { value: string; count: number }[];
  skinTypes: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  colors: { value: string; hex: string; count: number }[];
  priceMin: number;
  priceMax: number;
};

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
