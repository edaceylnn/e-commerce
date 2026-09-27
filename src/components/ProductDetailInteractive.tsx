"use client";

import { useState } from "react";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";
import { StarRating } from "@/components/StarRating";
import type { Product } from "@/lib/products";

// Owns the selected-variant state so the gallery (left) can react to the
// color half of that selection, and the purchase panel (right) to the rest —
// they used to be independent siblings with no shared state at all.
export function ProductDetailInteractive({
  product,
  discountedPrice,
}: {
  product: Product;
  discountedPrice: number;
}) {
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const selectedVariant = product.variants.find((v) => v.id === variantId) ?? null;

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <ProductGallery
        images={product.images}
        thumbnail={product.thumbnail}
        title={product.title}
        selectedColorId={selectedVariant?.colorId ?? null}
      />

      <div>
        <p className="font-mono text-caption tracking-eyebrow text-ink-soft">
          {product.brand ?? product.category}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{product.title}</h1>

        {product.ratingCount > 0 && (
          <div className="mt-3">
            <StarRating rating={product.rating} />
          </div>
        )}

        <ProductPurchasePanel
          product={product}
          discountedPrice={discountedPrice}
          variantId={variantId}
          onVariantChange={setVariantId}
        />
      </div>
    </div>
  );
}
