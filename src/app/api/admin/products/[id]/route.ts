import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { variantDuplicatesError, withGeneratedSkus } from "@/lib/product-variants";
import { sendPushToAll } from "@/lib/push/send";

const variantSchema = z.object({
  id: z.string().optional(),
  colorId: z.string().trim().min(1),
  sizeId: z.string().trim().min(1),
  // Blank = generate one on save (see withGeneratedSkus).
  sku: z.string().trim().default(""),
  stock: z.coerce.number().int().min(0).default(0),
  priceOverride: z.coerce.number().positive().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

// Accepts either a full URL (external CDN) or a root-relative path into
// /public (e.g. "/products/stripe-modal.jpg", how every seeded EDACEY product
// image is stored) — plain z.string().url() rejects the latter outright.
const imageRefSchema = z
  .string()
  .trim()
  .min(1)
  .refine((v) => /^https?:\/\//.test(v) || v.startsWith("/"), "Geçerli bir görsel URL'si veya /yol girin.");

const imageSchema = z.object({
  url: imageRefSchema,
  altText: z.string().trim().optional(),
  colorId: z.string().trim().optional(),
});

const productSchema = z.object({
  title: z.string().trim().min(1),
  // May be empty: the completeness check flags it, and an AI draft can fill it.
  description: z.string().trim().default(""),
  // Empty clears it — only the admin form writes this field.
  facts: z
    .string()
    .trim()
    .default("")
    .transform((v) => v || null),
  categorySlug: z.enum(CATEGORY_SLUGS),
  price: z.coerce.number().positive(),
  discountPercentage: z.coerce.number().min(0).max(100),
  cost: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).default(20),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  brandId: z.string().trim().optional(),
  sizeChartId: z.string().trim().optional(),
  tags: z.array(z.string()),
  isNew: z.boolean(),
  thumbnail: imageRefSchema,
  images: z.array(imageSchema).min(1),
  variants: z
    .array(variantSchema)
    .default([])
    .superRefine((variants, ctx) => {
      const error = variantDuplicatesError(variants);
      if (error) ctx.addIssue({ code: "custom", message: error });
    }),
  skinTypes: z.array(z.string()).default([]),
  skinConcerns: z.array(z.string()).default([]),
  finish: z.string().trim().optional(),
  coverage: z.string().trim().optional(),
  texture: z.string().trim().optional(),
  usagePurpose: z.string().trim().optional(),
  fullIngredients: z.string().trim().optional(),
  usageInstructions: z.string().trim().optional(),
  warnings: z.string().trim().optional(),
  isVegan: z.boolean().default(false),
  isCrueltyFree: z.boolean().default(false),
  isParabenFree: z.boolean().default(false),
  spf: z.coerce.number().int().min(0).max(100).optional(),
  volumeLabel: z.string().trim().optional(),
  origin: z.string().trim().optional(),
  expiryInfo: z.string().trim().optional(),
  ingredientIds: z.array(z.string()).default([]),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
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
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const category = await prisma.category.findUnique({
    where: { slug: parsed.data.categorySlug },
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const { categorySlug, images, variants: submittedVariants, ingredientIds, ...rest } = parsed.data;
  void categorySlug;
  const variants = await withGeneratedSkus(prisma, productId, submittedVariants);

  // Variants keep their id across an edit (so existing order/wishlist rows
  // stay pointed at a real variant) — rows the form dropped are deleted,
  // rows without an id are new. Ingredients have no such external
  // references, so the join table is simply cleared and rewritten.
  const existingVariants = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true, stock: true },
  });
  const existingStockById = new Map(existingVariants.map((v) => [v.id, v.stock]));
  const payloadVariantIds = new Set(
    variants.filter((v) => v.id).map((v) => v.id!)
  );
  const variantIdsToDelete = existingVariants
    .map((v) => v.id)
    .filter((vid) => !payloadVariantIds.has(vid));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productIngredient.deleteMany({ where: { productId } });
      if (variantIdsToDelete.length) {
        await tx.productVariant.deleteMany({ where: { id: { in: variantIdsToDelete } } });
      }
      await tx.product.update({
        where: { id: productId },
        data: {
          ...rest,
          categoryId: category.id,
          images: {
            create: images.map((img, position) => ({
              url: img.url,
              altText: img.altText || null,
              position,
              ...(img.colorId ? { color: { connect: { id: img.colorId } } } : {}),
            })),
          },
          ingredients: {
            create: ingredientIds.map((ingredientId) => ({ ingredientId })),
          },
          variants: {
            update: variants
              .map((v, position) => ({ v, position }))
              .filter(({ v }) => v.id)
              .map(({ v, position }) => ({
                where: { id: v.id! },
                data: {
                  color: { connect: { id: v.colorId } },
                  size: { connect: { id: v.sizeId } },
                  sku: v.sku,
                  stock: v.stock,
                  priceOverride: v.priceOverride ?? null,
                  lowStockThreshold: v.lowStockThreshold ?? null,
                  position,
                },
              })),
            create: variants
              .map((v, position) => ({ v, position }))
              .filter(({ v }) => !v.id)
              .map(({ v, position }) => ({
                color: { connect: { id: v.colorId } },
                size: { connect: { id: v.sizeId } },
                sku: v.sku,
                stock: v.stock,
                priceOverride: v.priceOverride ?? null,
                lowStockThreshold: v.lowStockThreshold ?? null,
                position,
              })),
          },
        },
      });

      // Every stock number the form actually changed leaves a ledger trail —
      // existing variants log the delta (manual correction), brand-new ones
      // log their starting count as "mal kabul".
      for (const v of variants) {
        if (v.id) {
          const previousStock = existingStockById.get(v.id);
          if (previousStock !== undefined && previousStock !== v.stock) {
            await tx.stockMovement.create({
              data: {
                productId,
                variantId: v.id,
                type: "MANUAL_ADJUSTMENT",
                quantity: v.stock - previousStock,
                previousStock,
                newStock: v.stock,
                note: "Admin ürün düzenleme",
              },
            });
          }
        } else if (v.stock > 0) {
          const created = await tx.productVariant.findFirst({
            where: { productId, sku: v.sku },
            select: { id: true },
          });
          await tx.stockMovement.create({
            data: {
              productId,
              variantId: created?.id,
              type: "RECEIVING",
              quantity: v.stock,
              previousStock: 0,
              newStock: v.stock,
              note: "Yeni varyant eklendi",
            },
          });
        }
      }

      // With variants each variant's change is logged above, and the product
      // total is set by the database — only a variant-less product's own
      // stock change is logged here.
      if (variants.length === 0 && existing.stock !== rest.stock) {
        await tx.stockMovement.create({
          data: {
            productId,
            type: "MANUAL_ADJUSTMENT",
            quantity: rest.stock - existing.stock,
            previousStock: existing.stock,
            newStock: rest.stock,
            note: "Admin ürün düzenleme",
          },
        });
      }
    });
  } catch (err) {
    console.error("admin product update error", err);
    return NextResponse.json(
      {
        error:
          "Kaydedilemedi — bir varyant SKU'su zaten kullanılıyor olabilir, ya da silinen bir varyanta bağlı sipariş/favori kayıtları var.",
      },
      { status: 409 }
    );
  }

  // Read back: for a product with variants the DB derived the total.
  const saved = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
  if (existing.stock === 0 && (saved?.stock ?? 0) > 0) {
    sendPushToAll(
      "EDACEY",
      `${parsed.data.title} tekrar stokta!`
    ).catch((err) => console.error("stock push notify error", err));
  }

  // The form stays open after saving, so it needs the saved variants back —
  // new rows now have ids (and generated SKUs); without them the next save
  // would delete and recreate those variants.
  const savedVariants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { position: "asc" },
    select: { id: true, colorId: true, sizeId: true, sku: true, stock: true, priceOverride: true, lowStockThreshold: true },
  });

  return NextResponse.json({
    ok: true,
    variants: savedVariants.map((v) => ({
      ...v,
      priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
      lowStockThreshold: v.lowStockThreshold ?? undefined,
    })),
  });
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
  const productId = Number(id);

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Bu ürün silinemedi — muhtemelen geçmiş siparişlerde referans veriliyor.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
