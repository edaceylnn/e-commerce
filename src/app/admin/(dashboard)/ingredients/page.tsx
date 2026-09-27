import { prisma } from "@/lib/db";
import { AdminIngredientsPanel } from "@/components/AdminIngredientsPanel";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminIngredientsPage() {
  const ingredients = await prisma.ingredient.findMany({
    include: { products: { include: { product: true } } },
    orderBy: { name: "asc" },
  });

  const rows = ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    description: ingredient.description,
    products: ingredient.products.map((pi) => ({
      id: pi.product.id,
      title: pi.product.title,
    })),
  }));

  return (
    <div>
      <PageHeader
        title="Aktif İçerikler"
        description="Niacinamide, Retinol gibi aktif içerikleri yönetin ve bu içeriği kullanan ürünleri görün."
      />
      <AdminIngredientsPanel ingredients={rows} />
    </div>
  );
}
