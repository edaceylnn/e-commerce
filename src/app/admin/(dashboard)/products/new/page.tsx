import { prisma } from "@/lib/db";
import { AdminProductForm } from "@/components/AdminProductForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { getSettings } from "@/lib/settings";

export default async function AdminNewProductPage() {
  const [colors, sizes, settings] = await Promise.all([
    prisma.color.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.size.findMany({ orderBy: { position: "asc" } }),
    getSettings(),
  ]);

  return (
    <div>
      <PageHeader breadcrumb={[{ label: "Ürünler", href: "/admin/products" }]} title="Yeni Ürün" />
      <AdminProductForm
        colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
        sizes={sizes.map((s) => ({ id: s.id, label: s.label }))}
        defaultLowStockThreshold={settings.defaultLowStockThreshold}
      />
    </div>
  );
}
