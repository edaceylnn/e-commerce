import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Kampanya adı gerekli."),
  description: z.string().trim().optional(),
  discountPercentage: z.coerce.number().positive().max(100),
  categoryId: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  minSpend: z.coerce.number().positive().optional(),
  startAt: z.string().min(1, "Başlangıç tarihi gerekli."),
  endAt: z.string().min(1, "Bitiş tarihi gerekli."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);
  if (endAt <= startAt) {
    return NextResponse.json(
      { error: "Bitiş tarihi başlangıçtan sonra olmalı." },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      discountPercentage: parsed.data.discountPercentage,
      categoryId: parsed.data.categoryId || undefined,
      brandId: parsed.data.brandId || undefined,
      minSpend: parsed.data.minSpend,
      startAt,
      endAt,
    },
  });

  return NextResponse.json({ id: campaign.id });
}
