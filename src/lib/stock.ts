// A variant's own lowStockThreshold overrides its product's; null means
// "inherit". A threshold of 0 naturally never trips the check below (it
// requires stock > 0), so it reads as "don't warn early, only flag when it
// actually runs out" without any special-casing.
export function effectiveLowStockThreshold(
  productThreshold: number,
  variantThreshold: number | null | undefined
): number {
  return variantThreshold ?? productThreshold;
}

export function isCriticalStock(stock: number, threshold: number): boolean {
  return stock > 0 && stock <= threshold;
}
