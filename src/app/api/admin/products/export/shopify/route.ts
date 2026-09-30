import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/email/outbox";
import { productsToShopifyRows } from "@/lib/shopify-csv";

// The whole catalog as a Shopify product CSV — importable into Shopify
// (Ürünler → İçe aktar) or back into this store.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" }, include: { color: true, size: true } },
    },
  });
  const rows = productsToShopifyRows(
    products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      vendor: p.brand?.name ?? null,
      type: p.category.label,
      tags: p.tags,
      status: p.status,
      price: Number(p.price),
      discountPercentage: Number(p.discountPercentage),
      cost: p.cost === null ? null : Number(p.cost),
      stock: p.stock,
      seoTitle: p.metaTitle,
      seoDescription: p.metaDescription,
      images: (p.images.length ? p.images : [{ url: p.thumbnail, altText: null }]).map((i) => ({ url: i.url, alt: i.altText })),
      variants: p.variants.map((v) => ({
        sku: v.sku,
        color: v.color.name,
        size: v.size.label,
        stock: v.stock,
        priceOverride: v.priceOverride === null ? null : Number(v.priceOverride),
      })),
    })),
    siteUrl
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="edacey-shopify-urunler-${date}.csv"`,
    },
  });
}
