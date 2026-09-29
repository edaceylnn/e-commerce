import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { generateProductCopy, ProductCopyError } from "@/lib/ai/product-copy";
import { loadImage } from "@/lib/ai/load-image";

// Keeps one request's image payload (and free-tier token use) bounded.
const MAX_ALT_IMAGES = 6;

// The form's current (possibly unsaved) values, so the admin doesn't have to
// save before generating. Colors/sizes arrive as ids and are resolved to
// names here — the client never decides what text reaches the model.
const inputSchema = z.object({
  title: z.string().trim().default(""),
  categorySlug: z.string().trim().default(""),
  description: z.string().trim().default(""),
  price: z.coerce.number().min(0).default(0),
  colorIds: z.array(z.string()).default([]),
  sizeIds: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string().trim(), altText: z.string().optional() })).default([]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const data = parsed.data;
  if (!data.title) {
    return NextResponse.json({ error: "Taslak üretmek için önce ürün adını girin." }, { status: 400 });
  }

  const [product, colors, sizes] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
    prisma.color.findMany({ where: { id: { in: data.colorIds } }, select: { name: true } }),
    prisma.size.findMany({
      where: { id: { in: data.sizeIds } },
      orderBy: { position: "asc" },
      select: { label: true },
    }),
  ]);
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const input = {
    title: data.title,
    category: PRODUCT_CATEGORIES.find((c) => c.slug === data.categorySlug)?.label ?? "",
    description: data.description,
    colors: colors.map((c) => c.name),
    sizes: [...new Set(sizes.map((s) => s.label))],
    price: data.price,
  };

  // Alt text is only drafted for photos that don't have one yet.
  const altCandidates = [...new Set(data.images.filter((img) => !img.altText?.trim()).map((img) => img.url))]
    .filter(Boolean)
    .slice(0, MAX_ALT_IMAGES);
  const images = (await Promise.all(altCandidates.map(loadImage))).filter((img) => img !== null);

  let result;
  try {
    result = await generateProductCopy(input, images);
  } catch (error) {
    if (error instanceof ProductCopyError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("product copy generation error", error);
    return NextResponse.json({ error: "Taslak üretilemedi." }, { status: 500 });
  }

  const meta = {
    input: { ...input, imageUrls: images.map((img) => img.url) },
    model: result.model,
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };

  const { copy } = result;
  const newDrafts = [
    { kind: "SHORT_DESCRIPTION" as const, aiText: copy.shortDescription },
    { kind: "META_TITLE" as const, aiText: copy.metaTitle },
    { kind: "META_DESCRIPTION" as const, aiText: copy.metaDescription },
    ...copy.imageAlts.map((alt) => ({ kind: "IMAGE_ALT" as const, aiText: alt.altText, imageUrl: alt.imageUrl })),
  ].filter((d) => d.aiText);

  // Generating again supersedes whatever was still waiting for review.
  const [, ...created] = await prisma.$transaction([
    prisma.contentDraft.updateMany({
      where: { productId, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: new Date() },
    }),
    ...newDrafts.map((d) => prisma.contentDraft.create({ data: { ...meta, ...d, productId } })),
  ]);

  return NextResponse.json({
    drafts: created.map((d) => ({ id: d.id, kind: d.kind, aiText: d.aiText, imageUrl: d.imageUrl })),
    missingInfo: copy.missingInfo,
  });
}
