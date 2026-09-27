import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z
  .object({
    active: z.boolean().optional(),
    label: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    startAt: z.string().trim().optional().nullable(),
    endAt: z.string().trim().optional().nullable(),
  })
  .refine(
    (v) => !v.startAt || !v.endAt || new Date(v.endAt) >= new Date(v.startAt),
    { message: "Bitiş tarihi başlangıçtan önce olamaz.", path: ["endAt"] }
  );

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  await prisma.collection
    .update({
      where: { id },
      data: {
        active: parsed.data.active,
        label: parsed.data.label,
        description: parsed.data.description,
        startAt: parsed.data.startAt === undefined ? undefined : parsed.data.startAt ? new Date(parsed.data.startAt) : null,
        endAt: parsed.data.endAt === undefined ? undefined : parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      },
    })
    .catch(() => null);

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
  await prisma.collection.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
