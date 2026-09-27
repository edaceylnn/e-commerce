import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        variantId: z.string().optional(),
      })
    )
    .min(1),
});

// Public, read-only stock/status lookup for whatever is currently in the
// (client-only, localStorage) cart — mirrors the product-detail page's own
// stock display, just batched for every line at once. No auth needed: this
// is the same stock number a signed-out visitor already sees on /products/[id].
// Also returns the product's current title and thumbnail: the cart persists
// both from add-to-cart time, and they go stale when a product is renamed or
// its photo changes.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: Record<
    string,
    {
      stock: number;
      active: boolean;
      price: number;
      title: string | null;
      thumbnail: string | null;
    }
  > = {};

  for (const item of parsed.data.items) {
    const key = `${item.id}-${item.variantId ?? ""}`;
    const product = productById.get(item.id);
    if (!product) {
      lines[key] = { stock: 0, active: false, price: 0, title: null, thumbnail: null };
      continue;
    }
    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;
    const stock = variant ? variant.stock : product.stock;
    const price = variant
      ? Number(variant.priceOverride ?? product.price)
      : Number(product.price) * (1 - Number(product.discountPercentage) / 100);
    lines[key] = {
      stock,
      active: product.status === "ACTIVE",
      price,
      title: product.title,
      thumbnail: product.thumbnail,
    };
  }

  return NextResponse.json({ lines });
}
