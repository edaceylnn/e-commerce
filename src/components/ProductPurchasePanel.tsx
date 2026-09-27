"use client";

import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "@/components/AddToCartButton";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { WishlistButton } from "@/components/WishlistButton";
import { VariantPicker } from "@/components/VariantPicker";
import type { Product } from "@/lib/products";
import { pillClassName } from "@/components/Pill";

export function ProductPurchasePanel({
  product,
  discountedPrice,
  variantId,
  onVariantChange,
}: {
  product: Product;
  discountedPrice: number;
  variantId: string | null;
  onVariantChange: (id: string) => void;
}) {
  const selectedVariant =
    product.variants.find((v) => v.id === variantId) ?? null;

  const price = selectedVariant
    ? selectedVariant.price ?? product.price
    : discountedPrice;
  const stock = selectedVariant ? selectedVariant.stock : product.stock;

  return (
    <>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-accent">{formatPrice(price)}</span>
        {!selectedVariant && product.discountPercentage > 0 && (
          <>
            <span className="text-sm text-ink-soft line-through">
              {formatPrice(product.price)}
            </span>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-dark">
              %{product.discountPercentage.toFixed(0)} indirim
            </span>
          </>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        {product.description}
      </p>

      {product.variants.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Seçenek
          </p>
          <VariantPicker
            variants={product.variants}
            selectedId={variantId}
            onSelect={onVariantChange}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-ink-soft">
        Stok durumu: {stock > 0 ? `${stock} adet` : "Tükendi"}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <AddToCartButton
          id={product.id}
          title={product.title}
          price={price}
          thumbnail={product.thumbnail}
          variantId={selectedVariant?.id}
          sku={selectedVariant?.sku}
          variantLabel={selectedVariant?.label}
          compareAtPrice={
            !selectedVariant && product.discountPercentage > 0
              ? product.price
              : undefined
          }
          disabled={stock <= 0}
        />
        <NotifyMeButton />
        <WishlistButton
          productId={product.id}
          showLabel
          className={pillClassName("outline", "w-full")}
        />
      </div>
    </>
  );
}
