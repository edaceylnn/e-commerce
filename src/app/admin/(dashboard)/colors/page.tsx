import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AdminColorsPanel } from "@/components/AdminColorsPanel";
import { PaletteIcon } from "@/components/icons/AdminIcons";
import { PackageIcon } from "@/components/icons/AccountIcons";

export default async function AdminColorsPage() {
  const colors = await prisma.color.findMany({
    include: { _count: { select: { variants: true } } },
    orderBy: { name: "asc" },
  });

  const activeCount = colors.filter((c) => c.active).length;
  const totalVariants = colors.reduce((sum, c) => sum + c._count.variants, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Katalog Mimarisi"
        title="Renk Yönetimi"
        description="Ürün varyantlarında kullanılan renk paletini yönetin."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Toplam Renk" value={colors.length} href="/admin/colors" icon={PaletteIcon} />
        <StatCard label="Aktif Renk" value={activeCount} href="/admin/colors" icon={PaletteIcon} />
        <StatCard label="Bağlı Varyant" value={totalVariants} href="/admin/products" icon={PackageIcon} />
      </div>

      <AdminColorsPanel
        colors={colors.map((c) => ({
          id: c.id,
          name: c.name,
          hex: c.hex,
          active: c.active,
          variantCount: c._count.variants,
        }))}
      />
    </div>
  );
}
