import Link from "next/link";
import { PRODUCT_CATEGORIES, getCategoryBySlug } from "@/lib/products";
import { activeCountsByCategory, LISTING_PAGE_SIZE, MAX_LISTING_PAGES, searchCatalog } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import {
  parseFilters,
  typeLabel,
  listingHref,
  EMPTY_FILTERS,
  type ListingContext,
  type SortKey,
} from "@/lib/product-filters";
import { ProductListing, type Chip, type Editorial, type ListingTab } from "@/components/plp/ProductListing";

// Category / product listing — design handoff screen 2.

const PAGE_TITLES: Record<string, string> = {
  new: "Yeni Gelenler",
  bestseller: "Çok Satanlar",
  discount: "İndirim",
};

// Category.description is empty for every seeded row — this is presentation
// copy (not fabricated product data), a fallback for the same three slugs
// PRODUCT_CATEGORIES already knows about.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  loungewear: "Sabah yogadan gece yatağına kadar üzerinde kalan, yumuşak kesimler.",
  spor: "Yogadan sokağa; taytlar, büstiyerler ve takımlar.",
  pijama: "Pijama takımları ve gecelikler; yavaşlayan akşamlar için.",
};
const PAGE_DESCRIPTIONS: Record<string, string> = {
  all: "Loungewear, spor ve pijama; taş, krem ve antrasit tonlarında sakin parçalar.",
  new: "Sezonun yeni parçaları, gelir gelmez burada.",
  discount: "Seçili parçalarda sezon sonu fiyatları.",
};

// Campaign shots for the listing's editorial breaks (see below).
const CATEGORY_IMAGES: Record<string, { src: string; position: string }> = {
  loungewear: { src: "/categories/loungewear.webp", position: "50% 22%" },
  spor: { src: "/categories/spor-studyo.webp", position: "50% 30%" },
  pijama: { src: "/categories/pijama.webp", position: "50% 18%" },
};

type SearchParams = {
  category?: string;
  q?: string;
  filter?: string;
  sort?: string;
  brand?: string | string[];
  type?: string | string[];
  size?: string | string[];
  color?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  inStock?: string;
  sayfa?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { category: categorySlug, q, filter, sort: sortParam } = sp;

  const category = categorySlug ? await getCategoryBySlug(categorySlug) : null;
  const filters = parseFilters(sp);
  const sortKey: SortKey = (sortParam as SortKey) || "onerilen";
  // "Daha fazla göster" is a plain link to ?sayfa=N+1, so it survives the
  // back button and can be shared; the page then shows the first N pages.
  const pages = Math.min(Math.max(1, Number(sp.sayfa) || 1), MAX_LISTING_PAGES);

  // Filtering, facet counts, sorting and paging all run in the database
  // (see src/lib/catalog.ts); only the shown products are loaded.
  const [catalog, countsByCategory, categoryIds] = await Promise.all([
    searchCatalog({
      scope: {
        categoryId: category?.id,
        q,
        onlyDiscounted: sortParam === "discount",
        // Same set the homepage "Yeni Gelenler" rail shows.
        newArrivals: !q && filter === "new",
      },
      filters,
      sort: sortKey,
      pages,
    }),
    activeCountsByCategory(),
    prisma.category.findMany({
      where: { slug: { in: PRODUCT_CATEGORIES.map((c) => c.slug) } },
      select: { id: true, slug: true },
    }),
  ]);
  const { products, facets } = catalog;
  const categoryCount = (slug: string) => countsByCategory.get(categoryIds.find((c) => c.slug === slug)?.id ?? "") ?? 0;
  const allCount = [...countsByCategory.values()].reduce((a, b) => a + b, 0);

  const ctx: ListingContext = { category: categorySlug, q, filter, sort: sortParam };
  const clearHref = listingHref(ctx, {
    ...EMPTY_FILTERS,
    brands: filters.brands,
    minRating: filters.minRating,
  });

  const heading = category
    ? category.label
    : q
      ? `"${q}" için sonuçlar`
      : (filter && PAGE_TITLES[filter]) || (sortParam && PAGE_TITLES[sortParam]) || "Tüm Ürünler";
  const description = category
    ? category.description || CATEGORY_DESCRIPTIONS[category.slug] || CATEGORY_DESCRIPTIONS[category.parent?.slug ?? ""]
    : q
      ? `${catalog.total} ürün bulundu.`
      : PAGE_DESCRIPTIONS[filter ?? sortParam ?? "all"] ?? PAGE_DESCRIPTIONS.all;

  // Tabs: a category's subcategories when it has any, else the top-level
  // categories (with counts) — the design's sub-category tab row.
  const tabs: ListingTab[] =
    category && category.children.length > 0
      ? [
          { href: `/products?category=${category.slug}`, label: "Tümü", count: catalog.scopeTotal, active: true },
          ...category.children.map((c) => ({
            href: `/products?category=${c.slug}`,
            label: c.label,
            active: false,
          })),
        ]
      : q || filter || sortParam === "discount"
        ? []
        : [
            { href: "/products", label: "Tümü", count: allCount, active: !category },
            ...PRODUCT_CATEGORIES.map((c) => ({
              href: `/products?category=${c.slug}`,
              label: c.label,
              count: categoryCount(c.slug),
              active: category?.slug === c.slug || category?.parent?.slug === c.slug,
            })),
          ];

  // "Filtreler  M ×  Krem ×  Tümünü temizle" — one link per active value.
  const without = (patch: Partial<typeof filters>) => listingHref(ctx, { ...filters, ...patch });
  const chips: Chip[] = [
    ...filters.sizes.map((s) => ({ label: `Beden ${s}`, href: without({ sizes: filters.sizes.filter((x) => x !== s) }) })),
    ...filters.colors.map((c) => ({ label: c, href: without({ colors: filters.colors.filter((x) => x !== c) }) })),
    ...filters.types.map((t) => ({ label: typeLabel(t), href: without({ types: filters.types.filter((x) => x !== t) }) })),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            label:
              filters.minPrice !== undefined && filters.maxPrice !== undefined
                ? `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`
                : filters.minPrice !== undefined
                  ? `${formatPrice(filters.minPrice)} üzeri`
                  : `${formatPrice(filters.maxPrice!)} altı`,
            href: without({ minPrice: undefined, maxPrice: undefined }),
          },
        ]
      : []),
    ...(filters.inStockOnly ? [{ label: "Stokta olanlar", href: without({ inStockOnly: false }) }] : []),
  ];

  const other = PRODUCT_CATEGORIES.find((c) => c.slug !== (category?.parent?.slug ?? category?.slug)) ?? PRODUCT_CATEGORIES[0];
  const editorials: { wide?: Editorial; block?: Editorial } = {
    wide: {
      title: "Evde rahatlık",
      text: "Yumuşak dokular, dışarıya taşan ev rahatlığı.",
      href: "/products?category=loungewear",
      cta: "Loungewear'ı keşfet",
      image: "/editorial/rahatlik-seninle.webp",
      imagePosition: "40% 25%",
    },
    block: {
      title: other.label,
      text: CATEGORY_DESCRIPTIONS[other.slug],
      href: `/products?category=${other.slug}`,
      cta: "Seçkiye göz at",
      image: CATEGORY_IMAGES[other.slug].src,
      imagePosition: CATEGORY_IMAGES[other.slug].position,
    },
  };

  const currentHref = listingHref(ctx, filters);
  const loadMoreHref =
    products.length < catalog.total && pages < MAX_LISTING_PAGES
      ? `${currentHref}${currentHref.includes("?") ? "&" : "?"}sayfa=${pages + 1}`
      : null;

  return (
    <div className="page-x pt-5">
      <nav aria-label="Konum" className="flex flex-wrap gap-2.5 text-nav tracking-[0.02em] text-text-3">
        <Link href="/" className="hover:text-ink">
          Anasayfa
        </Link>
        <span aria-hidden>/</span>
        {category?.parent && (
          <>
            <Link href={`/products?category=${category.parent.slug}`} className="hover:text-ink">
              {category.parent.label}
            </Link>
            <span aria-hidden>/</span>
          </>
        )}
        <span className="text-ink">{heading}</span>
      </nav>

      {/* Title and description only: product photos are the visuals here. */}
      <header className="mt-7 flex max-w-[640px] flex-col gap-3">
        <h1 className="headline text-[clamp(36px,3.4vw,52px)] leading-[1.02]">{heading}</h1>
        {description && <p className="max-w-[44ch] text-pretty text-body font-light text-ink-soft">{description}</p>}
      </header>

      <ProductListing
        products={products}
        tabs={tabs}
        chips={chips}
        clearHref={clearHref}
        facets={facets}
        filters={filters}
        ctx={ctx}
        sortKey={sortKey}
        totalCount={catalog.scopeTotal}
        resultTotal={catalog.total}
        loadMoreHref={loadMoreHref}
        pageSize={LISTING_PAGE_SIZE}
        editorials={editorials}
      />
    </div>
  );
}
