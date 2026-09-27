import Link from "next/link";
import {
  PRODUCT_CATEGORIES,
  getAllFeaturedProducts,
  getProductsByCategoryId,
  getCategoryBySlug,
  isNewProduct,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductSortSelect } from "@/components/ProductSortSelect";
import { ProductFilterDrawer } from "@/components/ProductFilterDrawer";
import { formatPrice } from "@/lib/format";
import {
  parseFilters,
  applyFilters,
  sortProducts,
  computeFacets,
  hasActiveFilters,
  typeLabel,
  type ProductFilters,
  type SortKey,
} from "@/lib/product-filters";

const PAGE_TITLES: Record<string, string> = {
  new: "Yeni Ürünler",
  bestseller: "Çok Satanlar",
};

// Category.description is empty for every seeded row — this is presentation
// copy (not fabricated product data), a fallback for the same three slugs
// PRODUCT_CATEGORIES already knows about.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  loungewear: "Sabah yogadan gece yatağına kadar üzerinde kalan, yumuşak kesimler.",
  spor: "Yogadan sokağa; taytlar, büstiyerler ve takımlar.",
  pijama: "Pijama takımları ve gecelikler; yavaşlayan akşamlar için.",
};

const PAGE_SIZE = 12;

type SearchParams = {
  category?: string;
  q?: string;
  filter?: string;
  sort?: string;
  brand?: string | string[];
  type?: string | string[];
  skinType?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  inStock?: string;
  page?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    category: categorySlug,
    q,
    filter,
    sort: sortParam,
    brand,
    type,
    skinType,
    minPrice,
    maxPrice,
    rating,
    inStock,
    page: pageParam,
  } = await searchParams;

  const category = categorySlug ? await getCategoryBySlug(categorySlug) : null;

  let baseProducts = category
    ? await getProductsByCategoryId(category.id)
    : await getAllFeaturedProducts();

  if (q) {
    const needle = q.toLowerCase();
    baseProducts = baseProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
    );
  }
  if (!q && filter === "new") {
    baseProducts = baseProducts.filter(isNewProduct);
  }

  // Facets reflect the category's full list — options never disappear as
  // filters narrow the grid below.
  const facets = computeFacets(baseProducts);
  const filters = parseFilters({ brand, type, skinType, minPrice, maxPrice, rating, inStock });
  const filtered = applyFilters(baseProducts, filters);

  const sortKey: SortKey = (sortParam as SortKey) || "onerilen";
  const sorted = sortProducts(filtered, sortKey);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const heading = category
    ? category.label
    : q
      ? `"${q}" için sonuçlar`
      : (filter && PAGE_TITLES[filter]) || (sortParam && PAGE_TITLES[sortParam]) || "Ürünler";

  const description = category
    ? category.description || CATEGORY_DESCRIPTIONS[category.slug]
    : undefined;

  // Every link on the page (pagination, "remove this filter" chips, "clear
  // all") is the current URL with some filters/page swapped out.
  function hrefFor(f: ProductFilters, page = 1): string {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (q) params.set("q", q);
    if (filter) params.set("filter", filter);
    if (sortParam) params.set("sort", sortParam);
    f.brands.forEach((b) => params.append("brand", b));
    f.types.forEach((t) => params.append("type", t));
    f.skinTypes.forEach((st) => params.append("skinType", st));
    if (f.minPrice !== undefined) params.set("minPrice", String(f.minPrice));
    if (f.maxPrice !== undefined) params.set("maxPrice", String(f.maxPrice));
    if (f.minRating !== undefined) params.set("rating", String(f.minRating));
    if (f.inStockOnly) params.set("inStock", "1");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  const clearHref = hrefFor({ brands: [], types: [], skinTypes: [], inStockOnly: false });

  // One removable chip per active filter.
  const chips: { label: string; href: string }[] = [
    ...filters.types.map((t) => ({
      label: typeLabel(t),
      href: hrefFor({ ...filters, types: filters.types.filter((x) => x !== t) }),
    })),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            label:
              filters.minPrice !== undefined && filters.maxPrice !== undefined
                ? `${formatPrice(filters.minPrice)} - ${formatPrice(filters.maxPrice)}`
                : filters.minPrice !== undefined
                  ? `${formatPrice(filters.minPrice)} üzeri`
                  : `${formatPrice(filters.maxPrice!)} altı`,
            href: hrefFor({ ...filters, minPrice: undefined, maxPrice: undefined }),
          },
        ]
      : []),
    ...(filters.inStockOnly
      ? [{ label: "Stokta olanlar", href: hrefFor({ ...filters, inStockOnly: false }) }]
      : []),
    ...(filters.minRating !== undefined
      ? [{ label: `${filters.minRating}+ puan`, href: hrefFor({ ...filters, minRating: undefined }) }]
      : []),
    ...filters.brands.map((b) => ({
      label: b,
      href: hrefFor({ ...filters, brands: filters.brands.filter((x) => x !== b) }),
    })),
  ];

  const otherCategories = PRODUCT_CATEGORIES.filter(
    (c) => c.slug !== category?.slug && c.slug !== category?.parent?.slug
  );
  const bestsellers =
    baseProducts.length > 4
      ? [...baseProducts].sort((a, b) => b.rating - a.rating).slice(0, 4)
      : [];

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <nav aria-label="Konum" className="text-caption text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Anasayfa
        </Link>
        {category?.parent && (
          <>
            {" / "}
            <Link href={`/products?category=${category.parent.slug}`} className="hover:text-ink">
              {category.parent.label}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-ink">{heading}</span>
      </nav>

      <header className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:mt-5">
        <div>
          <h1 className="font-display text-display-lg tracking-display">{heading}</h1>
          {description && (
            <p className="mt-2 max-w-lg text-body-sm text-ink-soft sm:text-sm">{description}</p>
          )}

          {category && category.children.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm">
              {category.children.map((child) => (
                <Link
                  key={child.slug}
                  href={`/products?category=${child.slug}`}
                  className="text-ink-soft underline-offset-4 transition hover:text-ink hover:underline"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-5 md:justify-end md:pb-1">
          <p className="whitespace-nowrap text-caption text-ink-soft">
            {sorted.length} ürün
          </p>
          <div className="flex items-center gap-5 sm:gap-7">
            <ProductFilterDrawer
              facets={facets}
              activeFilters={filters}
              totalCount={baseProducts.length}
              preserved={{ category: categorySlug, q, filter, sort: sortParam }}
              clearHref={clearHref}
            />
            <ProductSortSelect value={sortKey} />
          </div>
        </div>
      </header>

      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              aria-label={`${chip.label} filtresini kaldır`}
              className="group flex items-center gap-2 border border-line px-3 py-1.5 text-xs transition hover:border-ink"
            >
              {chip.label}
              <span aria-hidden className="text-ink-soft group-hover:text-ink">×</span>
            </Link>
          ))}
          <Link
            href={clearHref}
            className="ml-1 text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Tümünü temizle
          </Link>
        </div>
      )}

      <div className="mt-5 sm:mt-6">
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink-soft">Sonuç bulunamadı.</p>
            {hasActiveFilters(filters) && (
              <Link
                href={clearHref}
                className="mt-3 inline-block text-sm font-medium text-ink underline underline-offset-4"
              >
                Filtreleri temizle
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-9 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-14">
            {paginated.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Sayfalar" className="mt-14 flex items-center justify-center gap-1 font-mono text-sm">
            <Link
              href={hrefFor(filters, Math.max(1, currentPage - 1))}
              aria-label="Önceki sayfa"
              aria-disabled={currentPage === 1}
              className={`flex h-9 w-9 items-center justify-center ${
                currentPage === 1 ? "pointer-events-none opacity-30" : "hover:text-accent"
              }`}
            >
              ←
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={hrefFor(filters, p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`flex h-9 w-9 items-center justify-center border-b ${
                  p === currentPage ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {p}
              </Link>
            ))}
            <Link
              href={hrefFor(filters, Math.min(totalPages, currentPage + 1))}
              aria-label="Sonraki sayfa"
              aria-disabled={currentPage === totalPages}
              className={`flex h-9 w-9 items-center justify-center ${
                currentPage === totalPages ? "pointer-events-none opacity-30" : "hover:text-accent"
              }`}
            >
              →
            </Link>
          </nav>
        )}
      </div>

      {otherCategories.length > 0 && (
        <section className="mt-20 border-t border-line pt-10">
          <h2 className="font-display text-2xl">Benzer kategoriler</h2>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {otherCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="border-b border-ink pb-0.5 text-xs font-semibold uppercase tracking-label transition hover:border-accent hover:text-accent"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="font-display text-2xl">En Çok Satanlar</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 sm:gap-x-5">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
