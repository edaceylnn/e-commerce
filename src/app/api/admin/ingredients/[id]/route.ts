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

  const productCount = await prisma.productIngredient.count({
    where: { ingredientId: id },
  });
  if (productCount > 0) {
    return NextResponse.json(
      { error: "Bu içeriği kullanan ürünler var, önce onları kaldırın." },
      { status: 409 }
    );
  }

  await prisma.ingredient.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
