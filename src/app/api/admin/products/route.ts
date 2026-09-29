import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { totalVariantStock, variantDuplicatesError, withGeneratedSkus } from "@/lib/product-stock";

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
  discountPercentage: z.coerce.number().min(0).max(100).default(0),
  cost: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).default(20),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  brandId: z.string().trim().optional(),
  sizeChartId: z.string().trim().optional(),
  tags: z.array(z.string()).default([]),
  isNew: z.boolean().default(false),
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

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
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

  // Product.id is not autoincrement — the original DummyJSON ids were kept
  // on purpose for URL stability (see prisma/seed.ts) — so an admin-created
  // product gets the next free id computed here.
  const maxId = await prisma.product.aggregate({ _max: { id: true } });
  const nextId = (maxId._max.id ?? 0) + 1;

  const { categorySlug, images, variants: submittedVariants, ingredientIds, ...rest } = parsed.data;
  void categorySlug; // already resolved to `category` above
  const variants = await withGeneratedSkus(prisma, nextId, submittedVariants);
  // With variants the product total is derived, never taken from the form.
  if (variants.length) rest.stock = totalVariantStock(variants);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          id: nextId,
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
          variants: {
            create: variants.map((v, position) => ({
              color: { connect: { id: v.colorId } },
              size: { connect: { id: v.sizeId } },
              sku: v.sku,
              stock: v.stock,
              priceOverride: v.priceOverride ?? null,
              lowStockThreshold: v.lowStockThreshold ?? null,
              position,
            })),
          },
          ingredients: {
            create: ingredientIds.map((ingredientId) => ({ ingredientId })),
          },
        },
        include: { variants: true },
      });

      // Initial stock on a brand-new product/variant counts as "mal kabul".
      for (const v of created.variants) {
        if (v.stock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              variantId: v.id,
              type: "RECEIVING",
              quantity: v.stock,
              previousStock: 0,
              newStock: v.stock,
              note: "Yeni ürün oluşturuldu",
            },
          });
        }
      }
      if (created.variants.length === 0 && created.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "RECEIVING",
            quantity: created.stock,
            previousStock: 0,
            newStock: created.stock,
            note: "Yeni ürün oluşturuldu",
          },
        });
      }

      return created;
    });
    return NextResponse.json({ id: product.id });
  } catch {
    return NextResponse.json(
      { error: "Kaydedilemedi — bir varyant SKU'su zaten kullanılıyor olabilir." },
      { status: 409 }
    );
  }
}
