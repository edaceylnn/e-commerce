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
