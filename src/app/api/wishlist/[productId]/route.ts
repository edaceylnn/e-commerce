import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { productId } = await params;
  await prisma.wishlistItem.deleteMany({
    where: { userId: session.userId, productId: Number(productId) },
  });

  return NextResponse.json({ ok: true });
}
