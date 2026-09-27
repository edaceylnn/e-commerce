"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getStockStatus } from "@/lib/stock-status";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CloseIcon } from "@/components/icons/AdminIcons";

export function ProductQuickView({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const discounted = product.price * (1 - product.discountPercentage / 100);
  const stock = getStockStatus(product.stock);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative grid max-h-[90vh] w-full max-w-2xl grid-cols-1 gap-6 overflow-y-auto border border-line bg-background p-5 sm:grid-cols-2 sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-cream-deep text-ink transition hover:bg-primary hover:text-cream"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="relative aspect-square overflow-hidden bg-cream-deep">
          <Image src={product.thumbnail} alt={product.title} fill sizes="320px" className="object-cover" />
        </div>

        <div className="flex flex-col">
          <h2 className="pr-8 font-display text-xl">{product.title}</h2>
          {product.ratingCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-xs text-ink-soft">({product.ratingCount})</span>
            </div>
          )}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-accent">{formatPrice(discounted)}</span>
            {product.discountPercentage > 0 && (
              <span className="text-sm text-ink-soft line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="mt-2">
            <StatusBadge variant={stock.variant}>{stock.label}</StatusBadge>
          </div>

          <p className="mt-4 line-clamp-4 text-sm text-ink-soft">{product.description}</p>

          <div className="mt-auto flex flex-col gap-3 pt-5">
            <AddToCartButton
              id={product.id}
              title={product.title}
              price={discounted}
              thumbnail={product.thumbnail}
              disabled={product.stock <= 0}
            />
            <Link
              href={`/products/${product.id}`}
              className="text-center text-xs font-semibold uppercase tracking-wide text-primary underline underline-offset-4"
            >
              Ürün Sayfasına Git
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
