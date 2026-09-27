import { prisma } from "@/lib/db";
import { AdminBrandsPanel } from "@/components/AdminBrandsPanel";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const rows = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    productCount: brand._count.products,
  }));

  return (
    <div>
      <PageHeader title="Markalar" />
      <AdminBrandsPanel brands={rows} />
    </div>
  );
}
