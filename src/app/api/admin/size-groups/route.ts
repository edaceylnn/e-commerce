import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const sizeGroupSchema = z.object({
  name: z.string().trim().min(1, "Beden grubu adı gerekli."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sizeGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const existing = await prisma.sizeGroup.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "Bu isimde bir beden grubu zaten var." }, { status: 409 });
  }

  const sizeGroup = await prisma.sizeGroup.create({ data: parsed.data });
  return NextResponse.json({ id: sizeGroup.id });
}
