import { prisma } from "@/lib/db";
import { AdminProductForm } from "@/components/AdminProductForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSettings } from "@/lib/settings";

export default async function AdminNewProductPage() {
  const [brands, ingredients, colors, sizes, sizeCharts, settings] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.color.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.size.findMany({ orderBy: { position: "asc" } }),
    prisma.sizeChart.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  return (
    <div>
      <PageHeader title="Yeni Ürün" />
      <AdminProductForm
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        ingredients={ingredients.map((i) => ({ id: i.id, name: i.name }))}
        colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
        sizes={sizes.map((s) => ({ id: s.id, label: s.label }))}
        sizeCharts={sizeCharts.map((c) => ({ id: c.id, name: c.name }))}
        defaultLowStockThreshold={settings.defaultLowStockThreshold}
      />
    </div>
  );
}
