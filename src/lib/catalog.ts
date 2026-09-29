import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getProductsByIds, NEW_ARRIVAL_COUNT, type Product } from "@/lib/products";
import type { Facets, ProductFilters, SortKey } from "@/lib/product-filters";

// Storefront listing and search, done in the database. The listing page
// used to load every product of a category (with images and variants) and
// filter, count and sort in memory — 18 MB of HTML at 8k products — and
// "all products"/search only ever looked at the first 12 per category.
// Here the database filters, sorts and pages; only the shown page is
// loaded in full.

export const LISTING_PAGE_SIZE = 24;
// "Daha fazla göster" grows the page; past this it's a search problem.
export const MAX_LISTING_PAGES = 20;

export type CatalogScope = {
  categoryId?: string;
  q?: string;
  onlyDiscounted?: boolean;
  newArrivals?: boolean;
};

const EFFECTIVE_PRICE = Prisma.sql`(p."price" * (1 - p."discountPercentage" / 100))`;

// Search words, each matched at the start of a word in the accent-folded
// title + description (see the catalog_search migration): "tak" finds
// "Takımı" while typing, but "sort" doesn't find "Tişört" ("tisort") the
// way a plain substring match would. Regex characters typed by the
// visitor are escaped.
export function searchWords(q: string | undefined) {
  return (q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

// search_text(...) matches `word` at a word start (Postgres regex \m).
// "\\m" in this template: a bare "\m" is an invalid escape, and a template
// would silently drop the backslash.
const wordStart = (column: Prisma.Sql, word: string) =>
  Prisma.sql`${column} ~ ('\\m' || search_normalize(${word}))`;

function scopeConditions(scope: CatalogScope): Prisma.Sql[] {
  const conds = [Prisma.sql`p."status" = 'ACTIVE'`];
  if (scope.categoryId) conds.push(Prisma.sql`p."categoryId" = ${scope.categoryId}`);
  for (const word of searchWords(scope.q)) {
    conds.push(wordStart(Prisma.sql`search_text(p."title", p."description")`, word));
  }
  if (scope.onlyDiscounted) conds.push(Prisma.sql`p."discountPercentage" > 0`);
  if (scope.newArrivals) {
    // Same definition as selectNewArrivals(): flagged-new first, then newest.
    conds.push(Prisma.sql`p."id" IN (
      SELECT "id" FROM "Product" WHERE "status" = 'ACTIVE'
      ORDER BY "isNew" DESC, "id" DESC LIMIT ${NEW_ARRIVAL_COUNT})`);
  }
  return conds;
}

function filterConditions(f: ProductFilters): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [];
  if (f.sizes.length) {
    conds.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductVariant" v JOIN "Size" s ON s."id" = v."sizeId"
      WHERE v."productId" = p."id" AND v."stock" > 0 AND s."label" IN (${Prisma.join(f.sizes)}))`);
  }
  if (f.colors.length) {
    conds.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductVariant" v JOIN "Color" c ON c."id" = v."colorId"
      WHERE v."productId" = p."id" AND c."name" IN (${Prisma.join(f.colors)}))`);
  }
  if (f.brands.length) {
    conds.push(Prisma.sql`p."brandId" IN (SELECT "id" FROM "Brand" WHERE "slug" IN (${Prisma.join(f.brands)}))`);
  }
  if (f.types.length) conds.push(Prisma.sql`p."tags" && ${f.types}::text[]`);
  if (f.skinTypes.length) conds.push(Prisma.sql`p."skinTypes" && ${f.skinTypes}::text[]`);
  if (f.minPrice !== undefined && Number.isFinite(f.minPrice)) conds.push(Prisma.sql`${EFFECTIVE_PRICE} >= ${f.minPrice}`);
  if (f.maxPrice !== undefined && Number.isFinite(f.maxPrice)) conds.push(Prisma.sql`${EFFECTIVE_PRICE} <= ${f.maxPrice}`);
  if (f.minRating !== undefined && Number.isFinite(f.minRating)) conds.push(Prisma.sql`p."ratingAvg" >= ${f.minRating}`);
  if (f.inStockOnly) conds.push(Prisma.sql`p."stock" > 0`);
  return conds;
}

function orderBy(sort: SortKey, q: string | undefined): Prisma.Sql {
  switch (sort) {
    case "price-asc":
      return Prisma.sql`${EFFECTIVE_PRICE} ASC, p."id" ASC`;
    case "price-desc":
      return Prisma.sql`${EFFECTIVE_PRICE} DESC, p."id" ASC`;
    case "discount":
      return Prisma.sql`p."discountPercentage" DESC, p."id" ASC`;
    case "rating":
    case "bestseller":
      return Prisma.sql`p."ratingAvg" DESC, p."id" ASC`;
    case "newest":
      return Prisma.sql`p."isNew" DESC, p."id" DESC`;
    default: {
      const words = searchWords(q);
      if (!words.length) return Prisma.sql`p."id" ASC`;
      // Relevance: every word in the title beats a match that needed the
      // description; then the newest.
      const inTitle = Prisma.join(
        words.map((w) => wordStart(Prisma.sql`search_normalize(p."title")`, w)),
        " AND "
      );
      return Prisma.sql`(CASE WHEN ${inTitle} THEN 0 ELSE 1 END), p."createdAt" DESC, p."id" DESC`;
    }
  }
}

const where = (conds: Prisma.Sql[]) => Prisma.join(conds, " AND ");

export type CatalogPage = {
  products: Product[];
  // Matches after filters, and in the scope before them (for the drawer).
  total: number;
  scopeTotal: number;
  facets: Facets;
};

export async function searchCatalog({
  scope,
  filters,
  sort,
  pages = 1,
}: {
  scope: CatalogScope;
  filters: ProductFilters;
  sort: SortKey;
  pages?: number;
}): Promise<CatalogPage> {
  const scopeConds = scopeConditions(scope);
  const allConds = [...scopeConds, ...filterConditions(filters)];
  const limit = LISTING_PAGE_SIZE * Math.min(Math.max(1, Math.floor(pages)), MAX_LISTING_PAGES);

  const [page, facets] = await Promise.all([
    prisma.$queryRaw<{ id: number; total: bigint }[]>`
      SELECT p."id", count(*) OVER () AS total
      FROM "Product" p
      WHERE ${where(allConds)}
      ORDER BY ${orderBy(sort, scope.q)}
      LIMIT ${limit}`,
    catalogFacets(scopeConds),
  ]);

  // total comes with the rows; with no rows, nothing matched.
  const total = page.length ? Number(page[0].total) : 0;
  const ids = page.map((r) => r.id);
  const byId = new Map((await getProductsByIds(ids)).map((p) => [p.id, p]));
  const products = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  return { products, total, scopeTotal: facets.scopeTotal, facets: facets.facets };
}

// Filter options and their counts, over the scope before filters — so the
// options never disappear as the visitor narrows the list.
async function catalogFacets(scopeConds: Prisma.Sql[]) {
  const scopeSql = Prisma.sql`SELECT p.* FROM "Product" p WHERE ${where(scopeConds)}`;
  const [summary, sizes, colors, types, skinTypes, brands] = await Promise.all([
    prisma.$queryRaw<{ count: bigint; min: Prisma.Decimal | null; max: Prisma.Decimal | null }[]>`
      WITH scope AS (${scopeSql})
      SELECT count(*) AS count, min(${EFFECTIVE_PRICE}) AS min, max(${EFFECTIVE_PRICE}) AS max FROM scope p`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      WITH scope AS (${scopeSql})
      SELECT s."label" AS value, count(DISTINCT p."id") AS count
      FROM scope p JOIN "ProductVariant" v ON v."productId" = p."id" AND v."stock" > 0
      JOIN "Size" s ON s."id" = v."sizeId"
      GROUP BY s."label", s."position" ORDER BY s."position", s."label"`,
    prisma.$queryRaw<{ value: string; hex: string; count: bigint }[]>`
      WITH scope AS (${scopeSql})
      SELECT c."name" AS value, c."hex" AS hex, count(DISTINCT p."id") AS count
      FROM scope p JOIN "ProductVariant" v ON v."productId" = p."id"
      JOIN "Color" c ON c."id" = v."colorId"
      GROUP BY c."name", c."hex" ORDER BY c."name"`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      WITH scope AS (${scopeSql})
      SELECT t AS value, count(*) AS count FROM scope p, unnest(p."tags") t GROUP BY t ORDER BY count(*) DESC, t`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      WITH scope AS (${scopeSql})
      SELECT t AS value, count(*) AS count FROM scope p, unnest(p."skinTypes") t GROUP BY t ORDER BY count(*) DESC, t`,
    prisma.$queryRaw<{ slug: string; label: string; count: bigint }[]>`
      WITH scope AS (${scopeSql})
      SELECT b."slug" AS slug, b."name" AS label, count(*) AS count
      FROM scope p JOIN "Brand" b ON b."id" = p."brandId"
      GROUP BY b."slug", b."name" ORDER BY b."name"`,
  ]);

  const n = (v: bigint) => Number(v);
  return {
    scopeTotal: n(summary[0].count),
    facets: {
      brands: brands.map((b) => ({ slug: b.slug, label: b.label, count: n(b.count) })),
      types: types.map((t) => ({ value: t.value, count: n(t.count) })),
      skinTypes: skinTypes.map((t) => ({ value: t.value, count: n(t.count) })),
      sizes: sizes.map((s) => ({ value: s.value, count: n(s.count) })),
      colors: colors.map((c) => ({ value: c.value, hex: c.hex, count: n(c.count) })),
      priceMin: summary[0].min ? Math.floor(Number(summary[0].min)) : 0,
      priceMax: summary[0].max ? Math.ceil(Number(summary[0].max)) : 0,
    } satisfies Facets,
  };
}

// Active products per category (for the listing's category tabs).
export async function activeCountsByCategory() {
  const rows = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.categoryId, r._count._all]));
}
