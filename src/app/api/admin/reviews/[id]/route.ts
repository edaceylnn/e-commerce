import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Yorum bulunamadı." }, { status: 404 });
  }

  await prisma.review.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  // Product.ratingAvg/ratingCount are denormalized for cheap display reads
  // (ProductCard, listings) — recomputed here rather than on every page
  // view. Recomputed on every transition, not just "→ APPROVED": an admin
  // un-approving a previously-approved review (e.g. from the Onaylanan tab)
  // must also drop it out of the average, or a rejected review keeps
  // silently inflating the product's public rating.
  const agg = await prisma.review.aggregate({
    where: { productId: review.productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: review.productId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count,
    },
  });

  return NextResponse.json({ ok: true });
}
