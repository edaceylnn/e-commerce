import type { Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/slugify";

// Helpers for the admin product payload's variants. Product.stock of a
// product with variants is kept equal to their sum by the database itself
// (see the product_stock_trigger migration), not by code here.

// Zod refinement for the admin product payload: one row per color+size and
// no SKU twice in the same product.
export function variantDuplicatesError(variants: { colorId: string; sizeId: string; sku: string }[]) {
  const combos = new Set<string>();
  const skus = new Set<string>();
  for (const v of variants) {
    const combo = `${v.colorId}|${v.sizeId}`;
    if (combos.has(combo)) return "Aynı renk ve beden iki kez eklenmiş.";
    combos.add(combo);
    // Blank SKUs are generated later and can't clash (one per color+size).
    const sku = v.sku.trim().toLowerCase();
    if (!sku) continue;
    if (skus.has(sku)) return `"${v.sku}" SKU'su iki varyantta kullanılmış.`;
    skus.add(sku);
  }
  return null;
}

// Follows the seeded "ED-<id>-<beden>" SKUs, plus the color since a product
// can now have several: ED-123-ZEYTIN-YESILI-M. Unique because the product
// id is, and a product can't repeat a color+size.
export function generateSku(productId: number, colorName: string, sizeLabel: string) {
  return `ED-${productId}-${slugify(colorName).toUpperCase()}-${slugify(sizeLabel).toUpperCase()}`;
}

// Fills in every blank SKU; SKUs the admin typed are kept as they are.
export async function withGeneratedSkus<V extends { colorId: string; sizeId: string; sku: string }>(
  db: Prisma.TransactionClient,
  productId: number,
  variants: V[]
): Promise<V[]> {
  if (variants.every((v) => v.sku.trim())) return variants;
  const [colors, sizes] = await Promise.all([
    db.color.findMany({ where: { id: { in: variants.map((v) => v.colorId) } }, select: { id: true, name: true } }),
    db.size.findMany({ where: { id: { in: variants.map((v) => v.sizeId) } }, select: { id: true, label: true } }),
  ]);
  const colorName = new Map(colors.map((c) => [c.id, c.name]));
  const sizeLabel = new Map(sizes.map((s) => [s.id, s.label]));
  return variants.map((v) =>
    v.sku.trim()
      ? v
      : { ...v, sku: generateSku(productId, colorName.get(v.colorId) ?? v.colorId, sizeLabel.get(v.sizeId) ?? v.sizeId) }
  );
}
