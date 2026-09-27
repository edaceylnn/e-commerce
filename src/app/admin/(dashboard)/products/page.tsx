import { prisma } from "@/lib/db";
import { AdminProductsTable } from "@/components/AdminProductsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { PageTabs } from "@/components/admin/PageTabs";
import { AdminButtonLink } from "@/components/admin/Button";
import { DownloadIcon, PlusIcon } from "@/components/icons/AdminLuxeIcons";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { AdminProductFilters } from "@/components/AdminProductFilters";
import { AdminProductFilterPills } from "@/components/AdminProductFilterPills";
import { effectiveLowStockThreshold, isCriticalStock } from "@/lib/stock";
import type { Prisma } from "@/generated/prisma/client";

const VIEWS = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Yayında" },
  { key: "draft", label: "Taslak" },
  { key: "low-stock", label: "Kritik Stok" },
  { key: "out-of-stock", label: "Tükendi" },
  { key: "best-sellers", label: "Çok Satanlar" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function isViewKey(value: string | undefined): value is ViewKey {
  return !!value && VIEWS.some((v) => v.key === value);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; brand?: string; stock?: string; view?: string }>;
}) {
  const { q, category, brand, stock, view: rawView } = await searchParams;
  const view: ViewKey = isViewKey(rawView) ? rawView : "all";

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

  const [products, brands, salesRows] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      include: { category: true, brand: true, variants: true },
      orderBy: { id: "asc" },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
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

  const tabCounts = {
    all: allRows.length,
    active: allRows.filter((r) => r.status === "ACTIVE").length,
    draft: allRows.filter((r) => r.status === "DRAFT").length,
    "low-stock": allRows.filter((r) => r.isLowStock).length,
    "out-of-stock": allRows.filter((r) => r.stock === 0).length,
    "best-sellers": allRows.filter((r) => r.unitsSold > 0).length,
  } satisfies Record<ViewKey, number>;

  let rows = allRows;
  if (view === "active") rows = rows.filter((r) => r.status === "ACTIVE");
  if (view === "draft") rows = rows.filter((r) => r.status === "DRAFT");
  if (view === "out-of-stock") rows = rows.filter((r) => r.stock === 0);
  if (view === "best-sellers") {
    rows = rows.filter((r) => r.unitsSold > 0).sort((a, b) => b.unitsSold - a.unitsSold);
  }
  if (view === "low-stock") {
    rows = rows.filter((r) => r.isLowStock);
  }
  if (stock === "critical") rows = rows.filter((r) => r.isLowStock);
  if (stock === "in-stock") rows = rows.filter((r) => r.stock > 0);
  if (stock === "out-of-stock") rows = rows.filter((r) => r.stock === 0);

  function listHref(nextView: ViewKey) {
    const params = new URLSearchParams();
    if (nextView !== "all") params.set("view", nextView);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (stock) params.set("stock", stock);
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <PageHeader
        title="Ürünler"
        meta={`${allRows.length} ürün · ${tabCounts["low-stock"]} kritik stok`}
        actions={
          <div className="flex items-center gap-3">
            <AdminButtonLink
              variant="secondary"
              href={`/api/admin/products/export?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(category ? { category } : {}),
                ...(brand ? { brand } : {}),
                ...(stock ? { stock } : {}),
                ...(view !== "all" ? { view } : {}),
              }).toString()}`}
            >
              <DownloadIcon className="h-4 w-4" />
              Dışa Aktar
            </AdminButtonLink>
            <AdminButtonLink href="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Yeni Ürün
            </AdminButtonLink>
          </div>
        }
      />

      <div className="rounded-2xl border border-adm-border bg-adm-surface-card p-4">
        <PageTabs
          bare
          tabs={VIEWS.map((v) => ({
            href: listHref(v.key),
            label: v.label,
            count: tabCounts[v.key],
            active: view === v.key,
          }))}
          actions={
            <AdminProductFilterPills
              categories={PRODUCT_CATEGORIES}
              category={category ?? ""}
              q={q ?? ""}
              brand={brand ?? ""}
              stock={stock ?? ""}
              view={view}
            />
          }
        />

        <AdminProductFilters
          brands={brands}
          totalCount={rows.length}
          query={q ?? ""}
          category={category ?? ""}
          brand={brand ?? ""}
          stock={stock ?? ""}
          view={view}
        />
        <AdminProductsTable products={rows} embedded />
      </div>
    </div>
  );
}
