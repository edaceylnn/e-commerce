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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ addresses: [] });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({ addresses });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
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
  const address = await prisma.$transaction(async (tx) => {
    if (isDefaultShipping) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isDefaultShipping: false },
      });
    }
    if (isDefaultBilling) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isDefaultBilling: false },
      });
    }
    return tx.address.create({
      data: { ...rest, isDefaultShipping, isDefaultBilling, userId: session.userId },
    });
  });

  return NextResponse.json({ id: address.id });
}
