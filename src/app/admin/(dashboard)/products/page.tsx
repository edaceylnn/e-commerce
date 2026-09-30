import { prisma } from "@/lib/db";
import { AdminProductsTable } from "@/components/AdminProductsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminButtonLink } from "@/components/admin/Button";
import { DownloadIcon, PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { AdminProductFilters } from "@/components/AdminProductFilters";
import { effectiveLowStockThreshold, isCriticalStock } from "@/lib/stock";
import type { Prisma } from "@/generated/prisma/client";
import {
  ADMIN_PRODUCT_ORDER,
  adminProductFilterParams,
  applyStockFilter,
  parseAdminProductFilters,
  productStatusFor,
} from "@/lib/admin-product-filters";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    status?: string;
    stock?: string;
    view?: string;
  }>;
}) {
  const filters = parseAdminProductFilters(await searchParams);
  const { q, category, brand } = filters;

  const baseWhere: Prisma.ProductWhereInput = {};
  if (q) {
    baseWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (category) {
    baseWhere.category = { slug: category };
  }
  if (brand) {
    baseWhere.brand = { slug: brand };
  }

  const [products, salesRows] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      include: { category: true, brand: true, variants: true },
      orderBy: ADMIN_PRODUCT_ORDER,
    }),
    prisma.$queryRaw<{ productId: number; units_sold: bigint }[]>`
      SELECT oi."productId", SUM(oi.quantity)::bigint as units_sold
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY oi."productId"
    `,
  ]);

  const salesMap = new Map(salesRows.map((s) => [s.productId, Number(s.units_sold)]));

  const allRows = products.map((product) => {
    const variantCritical = product.variants.map((v) =>
      isCriticalStock(v.stock, effectiveLowStockThreshold(product.lowStockThreshold, v.lowStockThreshold))
    );
    const hasVariants = product.variants.length > 0;
    const criticalCount = variantCritical.filter(Boolean).length;
    const isLowStock = hasVariants
      ? criticalCount > 0
      : isCriticalStock(product.stock, product.lowStockThreshold);
    const isPartiallyCritical = hasVariants && criticalCount > 0 && criticalCount < variantCritical.length;

    return {
      id: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      brand: product.brand?.name ?? null,
      categoryLabel: product.category.label,
      categorySlug: product.category.slug,
      price: Number(product.price),
      stock: product.stock,
      isNew: product.isNew,
      status: product.status,
      variantCount: product.variants.length,
      sku: product.variants[0]?.sku ?? null,
      unitsSold: salesMap.get(product.id) ?? 0,
      isLowStock,
      isPartiallyCritical,
    };
  });

  // Summary counts cover the search/category scope, before status and
  // stock filters narrow the list.
  const draftCount = allRows.filter((r) => r.status === "DRAFT").length;
  const lowStockCount = allRows.filter((r) => r.isLowStock).length;

  const status = productStatusFor(filters.status);
  const rows = applyStockFilter(status ? allRows.filter((r) => r.status === status) : allRows, filters);

  return (
    <div>
      <PageHeader
        title="Ürünler"
        meta={`${allRows.length} ürün · ${draftCount} taslak · ${lowStockCount} kritik stok`}
        actions={
          <div className="flex items-center gap-3">
            <AdminButtonLink
              variant="secondary"
              href={`/api/admin/products/export?${adminProductFilterParams(filters)}`}
            >
              <DownloadIcon className="h-4 w-4" />
              Dışa Aktar
            </AdminButtonLink>
            <AdminButtonLink variant="secondary" href="/admin/products/import">
              Shopify CSV
            </AdminButtonLink>
            <AdminButtonLink href="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Yeni Ürün
            </AdminButtonLink>
          </div>
        }
      />

      <div className="rounded-2xl border border-adm-border bg-adm-surface-card p-4">
        <AdminProductFilters categories={PRODUCT_CATEGORIES} totalCount={rows.length} filters={filters} />
        <AdminProductsTable products={rows} embedded />
      </div>
    </div>
  );
}
