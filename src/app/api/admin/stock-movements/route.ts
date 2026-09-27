import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MANUAL_STOCK_MOVEMENT_TYPES } from "@/lib/stockMovements";

const movementSchema = z.object({
  productId: z.coerce.number().int(),
  variantId: z.string().trim().optional(),
  type: z.enum(MANUAL_STOCK_MOVEMENT_TYPES),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Miktar sıfır olamaz."),
  note: z.string().trim().min(1, "Açıklama zorunlu."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = movementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const { productId, variantId, type, quantity, note } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (variantId) {
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        if (variant.productId !== productId) {
          throw new Error("VARIANT_MISMATCH");
        }
        const newStock = variant.stock + quantity;
        if (newStock < 0) throw new Error("NEGATIVE_STOCK");

        await tx.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });
        await tx.stockMovement.create({
          data: {
            productId,
            variantId,
            type,
            quantity,
            previousStock: variant.stock,
            newStock,
            userId: session.userId,
            note,
          },
        });
      } else {
        const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
        const newStock = product.stock + quantity;
        if (newStock < 0) throw new Error("NEGATIVE_STOCK");

        await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
        await tx.stockMovement.create({
          data: {
            productId,
            type,
            quantity,
            previousStock: product.stock,
            newStock,
            userId: session.userId,
            note,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NEGATIVE_STOCK") {
      return NextResponse.json(
        { error: "Bu işlem stoğu negatife düşürür, önce mevcut stoğu kontrol edin." },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "VARIANT_MISMATCH") {
      return NextResponse.json({ error: "Varyant bu ürüne ait değil." }, { status: 400 });
    }
    return NextResponse.json({ error: "Ürün veya varyant bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
