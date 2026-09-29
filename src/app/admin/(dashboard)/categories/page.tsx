import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AdminCategoriesTree } from "@/components/AdminCategoriesTree";

export default async function AdminCategoriesPage() {
  const [topLevel, subCount, totalProducts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { position: "asc" },
        },
        _count: { select: { products: true } },
      },
      orderBy: { position: "asc" },
    }),
    prisma.category.count({ where: { parentId: { not: null } } }),
    prisma.product.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="Kategoriler"
        description="Ürün portföyünüzü hiyerarşik ağaç yapısı halinde organize edin."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Ana Kategoriler" value={topLevel.length} href="/admin/categories" />
        <StatCard label="Alt Kategoriler" value={subCount} href="/admin/categories" />
        <StatCard label="Toplam Ürün" value={totalProducts} href="/admin/products" />
      </div>

      <AdminCategoriesTree
        categories={topLevel.map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
          imageUrl: c.imageUrl,
          metaTitle: c.metaTitle,
          metaDescription: c.metaDescription,
          productCount: c._count.products,
          children: c.children.map((sub) => ({
            id: sub.id,
            label: sub.label,
            productCount: sub._count.products,
          })),
        }))}
      />
    </div>
  );
}
