import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const sizeSchema = z.object({
  sizeGroupId: z.string().trim().min(1),
  label: z.string().trim().min(1, "Beden etiketi gerekli."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const sizeGroup = await prisma.sizeGroup.findUnique({ where: { id: parsed.data.sizeGroupId } });
  if (!sizeGroup) {
    return NextResponse.json({ error: "Beden grubu bulunamadı." }, { status: 404 });
  }

  const existing = await prisma.size.findUnique({
    where: {
      sizeGroupId_label: { sizeGroupId: parsed.data.sizeGroupId, label: parsed.data.label },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu grupta aynı etikete sahip bir beden zaten var." }, { status: 409 });
  }

  const maxPosition = await prisma.size.aggregate({
    where: { sizeGroupId: parsed.data.sizeGroupId },
    _max: { position: true },
  });

  const size = await prisma.size.create({
    data: {
      sizeGroupId: parsed.data.sizeGroupId,
      label: parsed.data.label,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: size.id });
}
