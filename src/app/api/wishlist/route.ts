import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ productIds: [] });
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.userId },
    select: { productId: true },
  });

  return NextResponse.json({ productIds: items.map((i) => i.productId) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  }

  // Not a Prisma `upsert` on the compound unique key: Prisma's generated
  // compound-key lookup type requires `variantId` to be a non-null string
  // (a quirk of nullable columns in unique constraints), so a plain
  // find-then-create is used instead — variant-less wishlist rows have
  // variantId = null and Postgres treats every NULL as distinct anyway.
  const existing = await prisma.wishlistItem.findFirst({
    where: { userId: session.userId, productId, variantId: null },
  });
  if (!existing) {
    // Captured once at add-time so the favorites page can later show a
    // "Fiyat Düştü" badge without guessing — never recomputed afterwards.
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, discountPercentage: true },
    });
    const priceAtAdd = product
      ? Number(product.price) * (1 - Number(product.discountPercentage) / 100)
      : null;
    await prisma.wishlistItem.create({
      data: { userId: session.userId, productId, priceAtAdd },
    });
  }

  return NextResponse.json({ ok: true });
}
