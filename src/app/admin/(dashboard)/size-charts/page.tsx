import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AdminSizeChartsPanel } from "@/components/AdminSizeChartsPanel";

export default async function AdminSizeChartsPage() {
  const [sizeCharts, sizeGroups] = await Promise.all([
    prisma.sizeChart.findMany({
      include: { sizeGroup: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.sizeGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalProducts = sizeCharts.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <div>
      <PageHeader
        title="Beden Tabloları"
        description="Müşteriye doğru beden seçimi için ölçü rehberleri oluşturun."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Beden Tablosu" value={sizeCharts.length} href="/admin/size-charts" />
        <StatCard
          label="Bağlı Ürün"
          value={totalProducts}
          href="/admin/products"
        />
        <StatCard label="Beden Grubu" value={sizeGroups.length} href="/admin/sizes" />
      </div>

      <AdminSizeChartsPanel
        sizeCharts={sizeCharts.map((c) => ({
          id: c.id,
          name: c.name,
          sizeGroupName: c.sizeGroup.name,
          unit: c.unit,
          columns: c.columns,
          productCount: c._count.products,
        }))}
        sizeGroups={sizeGroups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
