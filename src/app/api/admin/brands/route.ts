import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Marka adı gerekli."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const existing = await prisma.brand.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu marka zaten kayıtlı." },
      { status: 409 }
    );
  }

  const baseSlug = slugify(parsed.data.name) || "marka";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.brand.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const brand = await prisma.brand.create({
    data: { name: parsed.data.name, slug },
  });

  return NextResponse.json({ id: brand.id });
}
