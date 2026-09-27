import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  active: z.boolean().optional(),
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

  if (parsed.data.name) {
    const existing = await prisma.color.findUnique({ where: { name: parsed.data.name } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Bu isimde bir renk zaten var." }, { status: 409 });
    }
  }

  await prisma.color.update({
    where: { id },
    data: parsed.data,
  });

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
    await prisma.color.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu renge bağlı ürün varyantları var, önce onları başka bir renge taşıyın." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
