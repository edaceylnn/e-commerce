// Pure, DB-free view helpers shared by ProductCard, the quick view and the
// product page. Type-only import from "@/lib/products" so Client Components
// can use this without pulling Prisma/pg into the browser bundle.
import type { Product, ProductVariantSummary } from "@/lib/products";

/** Selection ring for colour swatches — the only "shadow" in the design. */
export const SWATCH_RING = "shadow-[0_0_0_2px_var(--background),0_0_0_3px_var(--ink)]";

export type Swatch = { colorId: string; name: string; hex: string };

export type SizeOption = {
  label: string;
  /** Variant in the chosen colour for this size, or null if none exists. */
  variant: ProductVariantSummary | null;
  available: boolean;
};

export function discountedPrice(product: Product): number {
  return product.price * (1 - product.discountPercentage / 100);
}

/** Unit price for a cart line: a variant's own price override wins, else
 *  the product's list price; with no variant, the discounted price. */
export function priceFor(product: Product, variant: ProductVariantSummary | null): number {
  return variant ? variant.price ?? product.price : discountedPrice(product);
}

/** One swatch per distinct variant colour, in variant order. */
export function colorSwatches(product: Product): Swatch[] {
  const seen = new Map<string, Swatch>();
  for (const v of product.variants) {
    if (!seen.has(v.colorId)) {
      seen.set(v.colorId, { colorId: v.colorId, name: v.colorName, hex: v.colorHex });
    }
  }
  return [...seen.values()];
}

/** Every size the product comes in (variant order), resolved against the
 *  given colour: a size with no variant or no stock in that colour is
 *  unavailable. */
export function sizeOptions(product: Product, colorId: string | null): SizeOption[] {
  const labels = [...new Set(product.variants.map((v) => v.sizeLabel))];
  return labels.map((label) => {
    const variant =
      product.variants.find(
        (v) => v.sizeLabel === label && (colorId === null || v.colorId === colorId)
      ) ?? null;
    return { label, variant, available: !!variant && variant.stock > 0 };
  });
}

/** Image for the selected colour, falling back to the product thumbnail. */
export function imageForColor(product: Product, colorId: string | null): string {
  return (
    (colorId && product.images.find((img) => img.colorId === colorId)?.url) ||
    product.thumbnail
  );
}
