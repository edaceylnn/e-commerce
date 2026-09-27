import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

const categorySchema = z.object({
  label: z.string().trim().min(1, "Kategori adı gerekli."),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  parentId: z.string().trim().optional().or(z.literal("")),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const baseSlug = slugify(parsed.data.label) || "kategori";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const maxPosition = await prisma.category.aggregate({
    where: { parentId: parsed.data.parentId || null },
    _max: { position: true },
  });

  const category = await prisma.category.create({
    data: {
      slug,
      label: parsed.data.label,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      parentId: parsed.data.parentId || undefined,
      metaTitle: parsed.data.metaTitle || undefined,
      metaDescription: parsed.data.metaDescription || undefined,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: category.id, slug: category.slug });
}
