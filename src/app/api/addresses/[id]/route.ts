import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const addressSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING"]).default("SHIPPING"),
  label: z.string().trim().optional(),
  fullName: z.string().trim().min(1, "Ad soyad gerekli."),
  phone: z.string().trim().min(1, "Telefon gerekli."),
  line1: z.string().trim().min(1, "Adres gerekli."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Şehir gerekli."),
  district: z.string().trim().min(1, "İlçe gerekli."),
  postalCode: z.string().trim().min(1, "Posta kodu gerekli."),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Adres bulunamadı." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz adres." },
      { status: 400 }
    );
  }

  const { isDefaultShipping, isDefaultBilling, ...rest } = parsed.data;
  await prisma.$transaction(async (tx) => {
    if (isDefaultShipping) {
      await tx.address.updateMany({
        where: { userId: session.userId, id: { not: id } },
        data: { isDefaultShipping: false },
      });
    }
    if (isDefaultBilling) {
      await tx.address.updateMany({
        where: { userId: session.userId, id: { not: id } },
        data: { isDefaultBilling: false },
      });
    }
    await tx.address.update({
      where: { id },
      data: { ...rest, isDefaultShipping, isDefaultBilling },
    });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Adres bulunamadı." }, { status: 404 });
  }

  try {
    await prisma.address.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu adres silinemedi — geçmiş bir siparişte kullanılıyor." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
