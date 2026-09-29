import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AdminSizeGroupsPanel } from "@/components/AdminSizeGroupsPanel";

export default async function AdminSizesPage() {
  const groups = await prisma.sizeGroup.findMany({
    include: {
      sizes: {
        include: { _count: { select: { variants: true } } },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalSizes = groups.reduce((sum, g) => sum + g.sizes.length, 0);
  const totalVariants = groups.reduce(
    (sum, g) => sum + g.sizes.reduce((s, sz) => s + sz._count.variants, 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="Bedenler"
        description="Ürün varyantlarında kullanılan beden gruplarını ve bedenleri yönetin."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Beden Grubu" value={groups.length} href="/admin/sizes" />
        <StatCard label="Toplam Beden" value={totalSizes} href="/admin/sizes" />
        <StatCard label="Bağlı Varyant" value={totalVariants} href="/admin/products" />
      </div>

      <AdminSizeGroupsPanel
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          sizes: g.sizes.map((s) => ({
            id: s.id,
            label: s.label,
            variantCount: s._count.variants,
          })),
        }))}
      />
    </div>
  );
}
