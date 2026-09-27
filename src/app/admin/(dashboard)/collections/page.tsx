import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCollectionsPanel } from "@/components/AdminCollectionsPanel";

export default async function AdminCollectionsPage() {
  const collections = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Koleksiyonlar"
        description="Mağaza vitrininde öne çıkan özel temalı ürün gruplarını yönetin."
      />
      <AdminCollectionsPanel
        collections={collections.map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
          active: c.active,
          startAt: c.startAt?.toISOString() ?? null,
          endAt: c.endAt?.toISOString() ?? null,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
