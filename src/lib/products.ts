// Product catalog data layer — reads the store's own Postgres database via
// Prisma. The catalog (loungewear / spor / pijama) is seeded by
// `prisma/seed.ts`.
import { prisma } from "@/lib/db";
import { PRODUCT_CATEGORIES, type CategorySlug } from "@/lib/categories";

export { PRODUCT_CATEGORIES, type CategorySlug };

export type ProductVariantSummary = {
  id: string;
  label: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  sku: string;
  stock: number;
  price: number | null;
};

export type ProductImageSummary = {
  url: string;
  colorId: string | null;
  altText: string | null;
};

export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  ratingCount: number;
  stock: number;
  tags: string[];
  brand?: string;
  brandSlug?: string;
  thumbnail: string;
  images: ProductImageSummary[];
  isNew: boolean;
  variants: ProductVariantSummary[];
  volumeLabel: string | null;
  skinTypes: string[];
};

export type CategorySummary = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
};

// Only ever shown to customers when ACTIVE — DRAFT/ARCHIVED products stay
// visible to admins (who query Product directly, not through this file).
const STOREFRONT_WHERE = { status: "ACTIVE" as const };

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  category: true,
  brand: true,
  variants: {
    orderBy: { position: "asc" as const },
    include: { color: true, size: true },
  },
};

type ProductWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.product.findFirst<{ include: typeof productInclude }>>>
>;

function toProduct(row: ProductWithRelations): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category.slug,
    price: Number(row.price),
    discountPercentage: Number(row.discountPercentage),
    rating: Number(row.ratingAvg),
    ratingCount: row.ratingCount,
    stock: row.stock,
    tags: row.tags,
    brand: row.brand?.name,
    brandSlug: row.brand?.slug,
    thumbnail: row.thumbnail,
    images: row.images.map((img) => ({
      url: img.url,
      colorId: img.colorId,
      altText: img.altText,
    })),
    isNew: row.isNew,
    variants: row.variants.map((v) => ({
      id: v.id,
      label: `${v.size.label} / ${v.color.name}`,
      colorId: v.colorId,
      colorName: v.color.name,
      colorHex: v.color.hex,
      sizeLabel: v.size.label,
      sku: v.sku,
      stock: v.stock,
      price: v.priceOverride ? Number(v.priceOverride) : null,
    })),
    volumeLabel: row.volumeLabel,
    skinTypes: row.skinTypes,
  };
}

// General-purpose category lookup (accepts any Category row, including
// subcategories — unlike PRODUCT_CATEGORIES, which is only the fixed
// top-level trio used for primary nav).
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: { label: "asc" } },
    },
  });
}

export async function getProductsByCategoryId(categoryId: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { categoryId, ...STOREFRONT_WHERE },
    include: productInclude,
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

export async function getProductsByCategory(
  category: CategorySlug
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: { slug: category }, ...STOREFRONT_WHERE },
    include: productInclude,
    take: 12,
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

export async function getAllFeaturedProducts(): Promise<Product[]> {
  const results = await Promise.all(
    PRODUCT_CATEGORIES.map((c) => getProductsByCategory(c.slug))
  );
  return results.flat();
}

export async function getProductById(id: number): Promise<Product> {
  // findUnique can't take extra filters (only the unique key) — findFirst
  // is required to combine `id` with the ACTIVE-only storefront rule.
  const row = await prisma.product.findFirst({
    where: { id, ...STOREFRONT_WHERE },
    include: productInclude,
  });
  if (!row) {
    throw new Error(`Product not found: ${id}`);
  }
  return toProduct(row);
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, ...STOREFRONT_WHERE },
    include: productInclude,
  });
  return rows.map(toProduct);
}

export function isNewProduct(product: Product): boolean {
  return product.isNew;
}

export const NEW_ARRIVAL_COUNT = 8;

// The one definition of "Yeni Gelenler", shared by the homepage rail, its
// "Tümünü gör" link (/products?filter=new) and the category-list count so
// they always show the same products: flagged-new products first, topped
// up with the most recently added ones (highest id) to NEW_ARRIVAL_COUNT.
export function selectNewArrivals(products: Product[]): Product[] {
  const newestFirst = [...products].sort((a, b) => b.id - a.id);
  return [...newestFirst.filter(isNewProduct), ...newestFirst.filter((p) => !isNewProduct(p))].slice(
    0,
    NEW_ARRIVAL_COUNT
  );
}

// Units sold per product, from orders that were actually paid and not
// reversed (cancelled / returned orders and refunded lines don't count).
// Drives the homepage "Çok Satanlar" ordering.
export async function getUnitsSoldByProduct(): Promise<Map<number, number>> {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      refundedAt: null,
      order: { status: { in: ["HAZIRLANIYOR", "KARGOLANDI", "TESLIM_EDILDI"] } },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}

// Lightweight id-only listing for sitemap.ts — avoids pulling every
// relation a full Product needs just to build a list of URLs.
export async function getAllActiveProductIds(): Promise<number[]> {
  const rows = await prisma.product.findMany({
    where: STOREFRONT_WHERE,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: {
      ...STOREFRONT_WHERE,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: productInclude,
    take: 20,
    orderBy: { id: "asc" },
  });
  return rows.map(toProduct);
}

export type SizeChartView = {
  unit: string;
  columns: string[];
  rows: { size: string; values: Record<string, string | number | null> }[];
};

export type ProductExtras = {
  sizeChart: SizeChartView | null;
  composition: string | null;
  care: string | null;
  warnings: string | null;
};

// Product-page-only extras kept out of the shared Product shape (cards and
// listings never need them): the size chart for the size-guide drawer and
// the composition/care copy for the accordions.
export async function getProductExtras(id: number): Promise<ProductExtras> {
  const row = await prisma.product.findUnique({
    where: { id },
    select: {
      fullIngredients: true,
      usageInstructions: true,
      warnings: true,
      sizeChart: {
        include: { rows: { include: { size: true } } },
      },
    },
  });

  const chart = row?.sizeChart;
  return {
    sizeChart:
      chart && chart.rows.length > 0
        ? {
            unit: chart.unit,
            columns: chart.columns,
            rows: [...chart.rows]
              .sort((a, b) => a.size.position - b.size.position)
              .map((r) => ({
                size: r.size.label,
                values: (r.measurements ?? {}) as Record<string, string | number | null>,
              })),
          }
        : null,
    composition: row?.fullIngredients ?? null,
    care: row?.usageInstructions ?? null,
    warnings: row?.warnings ?? null,
  };
}
