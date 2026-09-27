import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

const ingredientSchema = z.object({
  name: z.string().trim().min(1, "İçerik adı gerekli."),
  description: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ingredientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const existing = await prisma.ingredient.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu içerik zaten kayıtlı." },
      { status: 409 }
    );
  }

  const baseSlug = slugify(parsed.data.name) || "icerik";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.ingredient.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || undefined,
    },
  });

  return NextResponse.json({ id: ingredient.id });
}
