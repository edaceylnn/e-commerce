import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProductsByCategory, type CategorySlug } from "@/lib/products";

// Lightweight "you might also like" feed for the cart page's cross-sell
// strip. Takes the cart's own product ids (not a category param) so a
// mixed-category cart still gets sensible suggestions — we look up which
// categories those products belong to, then pull from the same ones.
// Public and read-only, so no auth needed.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n));
  const limit = Math.min(Number(searchParams.get("limit")) || 4, 8);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const cartProducts = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { category: { select: { slug: true } } },
  });
  const categorySlugs = [
    ...new Set(cartProducts.map((p) => p.category.slug)),
  ] as CategorySlug[];

  const exclude = new Set(ids);
  const seen = new Set<number>();
  const suggestions = [];

  for (const slug of categorySlugs) {
    const candidates = await getProductsByCategory(slug);
    for (const product of candidates) {
      if (exclude.has(product.id) || seen.has(product.id)) continue;
      seen.add(product.id);
      suggestions.push(product);
      if (suggestions.length >= limit) break;
    }
    if (suggestions.length >= limit) break;
  }

  return NextResponse.json({ products: suggestions });
}
