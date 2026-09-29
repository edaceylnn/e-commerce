// URL filters of the admin product list, shared by the page and its CSV
// export so "Dışa Aktar" always exports exactly what's on screen. Pure — safe
// from Server or Client components.

export const PRODUCT_STATUS_FILTERS = [
  { value: "active", label: "Yayında", status: "ACTIVE" },
  { value: "draft", label: "Taslak", status: "DRAFT" },
  { value: "archived", label: "Arşiv", status: "ARCHIVED" },
] as const;

export const PRODUCT_STOCK_FILTERS = [
  { value: "critical", label: "Kritik stok" },
  { value: "in-stock", label: "Stokta" },
  { value: "out-of-stock", label: "Tükendi" },
] as const;

type StatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number]["value"];
type StockFilter = (typeof PRODUCT_STOCK_FILTERS)[number]["value"];

export type AdminProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  status?: StatusFilter;
  stock?: StockFilter;
};

// Newest first: the product just added is the one an admin usually wants
// next. Ties (e.g. seeded together) fall back to the higher id.
export const ADMIN_PRODUCT_ORDER = [{ createdAt: "desc" as const }, { id: "desc" as const }];

function oneOf<T extends string>(value: string | undefined, options: readonly { value: T }[]) {
  return options.find((o) => o.value === value)?.value;
}

// The list used to be split into tabs (?view=…). Old links — bookmarks, the
// critical-stock page's "Etkilenen Ürün" card — land on the same result
// (the old "best-sellers" tab has no equivalent any more and shows all).
const LEGACY_VIEWS: Record<string, Partial<AdminProductFilters>> = {
  active: { status: "active" },
  draft: { status: "draft" },
  "low-stock": { stock: "critical" },
  "out-of-stock": { stock: "out-of-stock" },
};

export function parseAdminProductFilters(params: {
  q?: string | null;
  category?: string | null;
  brand?: string | null;
  status?: string | null;
  stock?: string | null;
  view?: string | null;
}): AdminProductFilters {
  const legacy = LEGACY_VIEWS[params.view ?? ""] ?? {};
  return {
    q: params.q || undefined,
    category: params.category || undefined,
    brand: params.brand || undefined,
    status: oneOf(params.status ?? undefined, PRODUCT_STATUS_FILTERS) ?? legacy.status,
    stock: oneOf(params.stock ?? undefined, PRODUCT_STOCK_FILTERS) ?? legacy.stock,
  };
}

export function adminProductFilterParams(filters: AdminProductFilters) {
  const params = new URLSearchParams();
  for (const key of ["q", "category", "brand", "status", "stock"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function productStatusFor(filter: StatusFilter | undefined) {
  return PRODUCT_STATUS_FILTERS.find((s) => s.value === filter)?.status;
}

// The stock part of the filters, applied to rows that already carry the
// computed critical-stock flag.
export function applyStockFilter<T extends { stock: number; isLowStock: boolean }>(
  rows: T[],
  filters: AdminProductFilters
) {
  if (filters.stock === "critical") return rows.filter((r) => r.isLowStock);
  if (filters.stock === "in-stock") return rows.filter((r) => r.stock > 0);
  if (filters.stock === "out-of-stock") return rows.filter((r) => r.stock === 0);
  return rows;
}
