import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
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

  await prisma.category.update({
    where: { id },
    data: {
      label: parsed.data.label,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || undefined,
      metaTitle: parsed.data.metaTitle,
      metaDescription: parsed.data.metaDescription,
      position: parsed.data.position,
    },
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
    await prisma.category.delete({ where: { id } });
  } catch {
    // Child subcategories cascade-delete automatically (see schema), but a
    // category with products still assigned to it is blocked by the FK.
    return NextResponse.json(
      { error: "Bu kategoriye bağlı ürünler var, önce onları başka bir kategoriye taşıyın." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
