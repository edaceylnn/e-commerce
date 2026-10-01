import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminProductForm } from "@/components/AdminProductForm";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    notFound();
  }

  const [product, colors, sizes, pendingDrafts] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { position: "asc" } },
        category: true,
        brand: true,
        variants: { orderBy: { position: "asc" } },
      },
    }),
    prisma.color.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.size.findMany({ orderBy: { position: "asc" } }),
    prisma.contentDraft.findMany({
      where: { productId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, aiText: true, imageUrl: true },
    }),
  ]);
  if (!product) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Ürünler", href: "/admin/products" }]}
        title={product.title}
      />
      <AdminProductForm
        productId={product.id}
        colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
        sizes={sizes.map((s) => ({ id: s.id, label: s.label }))}
        pendingDrafts={pendingDrafts}
        initial={{
          title: product.title,
          description: product.description,
          facts: product.facts ?? undefined,
          categorySlug: product.category.slug,
          price: Number(product.price),
          discountPercentage: Number(product.discountPercentage),
          cost: product.cost ? Number(product.cost) : undefined,
          taxRate: Number(product.taxRate),
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          brandId: product.brandId ?? undefined,
          sizeChartId: product.sizeChartId ?? undefined,
          tags: product.tags,
          isNew: product.isNew,
          thumbnail: product.thumbnail,
          images: product.images.map((image) => ({
            url: image.url,
            altText: image.altText ?? undefined,
            colorId: image.colorId ?? undefined,
          })),
          variants: product.variants.map((v) => ({
            id: v.id,
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku,
            stock: v.stock,
            priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
            lowStockThreshold: v.lowStockThreshold ?? undefined,
          })),
          composition: product.composition ?? undefined,
          careInstructions: product.careInstructions ?? undefined,
          metaTitle: product.metaTitle ?? undefined,
          metaDescription: product.metaDescription ?? undefined,
          status: product.status,
        }}
      />
    </div>
  );
}
