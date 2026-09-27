import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

const collectionSchema = z
  .object({
    label: z.string().trim().min(1, "Koleksiyon adı gerekli."),
    description: z.string().trim().optional(),
    productIds: z.array(z.number().int()).optional(),
    startAt: z.string().trim().optional(),
    endAt: z.string().trim().optional(),
  })
  .refine(
    (v) => !v.startAt || !v.endAt || new Date(v.endAt) >= new Date(v.startAt),
    { message: "Bitiş tarihi başlangıçtan önce olamaz.", path: ["endAt"] }
  );

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = collectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const baseSlug = slugify(parsed.data.label) || "koleksiyon";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.collection.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const collection = await prisma.collection.create({
    data: {
      slug,
      label: parsed.data.label,
      description: parsed.data.description || undefined,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
      products: parsed.data.productIds?.length
        ? { create: parsed.data.productIds.map((productId) => ({ productId })) }
        : undefined,
    },
  });

  return NextResponse.json({ id: collection.id, slug: collection.slug });
}
