import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;

  const [productCount, campaignCount] = await Promise.all([
    prisma.product.count({ where: { brandId: id } }),
    prisma.campaign.count({ where: { brandId: id } }),
  ]);
  if (productCount > 0 || campaignCount > 0) {
    return NextResponse.json(
      { error: "Bu markaya bağlı ürün veya kampanya var, önce onları kaldırın." },
      { status: 409 }
    );
  }

  await prisma.brand.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
