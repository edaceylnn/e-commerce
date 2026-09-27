import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  position: z.number().int().optional(),
});

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (parsed.data.label) {
    const size = await prisma.size.findUnique({ where: { id } });
    if (!size) {
      return NextResponse.json({ error: "Beden bulunamadı." }, { status: 404 });
    }
    const existing = await prisma.size.findUnique({
      where: { sizeGroupId_label: { sizeGroupId: size.sizeGroupId, label: parsed.data.label } },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Bu grupta aynı etikete sahip bir beden zaten var." }, { status: 409 });
    }
  }

  await prisma.size.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.size.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu bedene bağlı ürün varyantları var, önce onları başka bir bedene taşıyın." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
