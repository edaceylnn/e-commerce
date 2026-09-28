"use client";

import { useCallback } from "react";
import type { Product, ProductVariantSummary } from "@/lib/products";
import { useCartStore } from "@/lib/store/cart-store";
import { showToast } from "@/lib/store/toast-store";
import { imageForColor, priceFor } from "@/lib/product-view";

// Single add-to-bag path for the product card's quick-add strip, the quick
// view and the product page, so the cart line (price rule, variant label,
// colour image) and the confirmation toast are identical everywhere.
export function useAddToBag(product: Product) {
  const addItem = useCartStore((s) => s.addItem);

  return useCallback(
    (variant: ProductVariantSummary | null) => {
      addItem({
        id: product.id,
        title: product.title,
        price: priceFor(product, variant),
        thumbnail: imageForColor(product, variant?.colorId ?? null),
        variantId: variant?.id,
        sku: variant?.sku,
        variantLabel: variant?.label,
        compareAtPrice:
          !variant && product.discountPercentage > 0 ? product.price : undefined,
      });
      const detail = variant ? `, ${variant.colorName}, ${variant.sizeLabel}` : "";
      showToast(`${product.title}${detail} sepete eklendi`);
    },
    [addItem, product]
  );
}
