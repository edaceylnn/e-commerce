"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import { QuickAddButton } from "@/components/QuickAddButton";
import { getStockStatus } from "@/lib/stock-status";
import { ProductQuickView } from "@/components/ProductQuickView";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";

const HOVER_ICON_CLASS =
  "flex h-10 w-10 items-center justify-center bg-ivory text-ink transition hover:bg-accent hover:text-cream";

export function WishlistProductCard({
  product,
  priceAtAdd,
}: {
  product: Product;
  priceAtAdd: number | null;
}) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const remove = useWishlistStore((s) => s.remove);

  const discounted = product.price * (1 - product.discountPercentage / 100);
  const priceDropped = priceAtAdd !== null && discounted < priceAtAdd - 0.01;
  const stock = getStockStatus(product.stock);

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoved(true);
    remove(product.id);
    await fetch(`/api/wishlist/${product.id}`, { method: "DELETE" });
  }

  if (removed) return null;

  return (
    <>
      <div className="group flex flex-col">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            {priceDropped && (
              <span className="absolute left-2.5 top-2.5 bg-accent px-2 py-1 text-caption font-medium uppercase tracking-label text-accent-ink">
                Fiyat Düştü
              </span>
            )}
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Favorilerden çıkar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-ivory text-primary transition hover:bg-primary hover:text-cream"
            >
              <HeartIcon filled className="h-4 w-4" />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex translate-y-3 justify-center gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <div className="pointer-events-auto flex gap-2">
                <QuickAddButton
                  id={product.id}
                  title={product.title}
                  price={discounted}
                  thumbnail={product.thumbnail}
                  className={HOVER_ICON_CLASS}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickViewOpen(true);
                  }}
                  aria-label="Hızlı İncele"
                  className={HOVER_ICON_CLASS}
                >
                  <SearchIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2">
            <h3 className="text-body-sm font-medium">{product.title}</h3>
            <span className="shrink-0 text-body-sm font-medium">
              {formatPrice(discounted)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {product.ratingCount > 0 && (
              <>
                <StarRating rating={product.rating} />
                <span className="text-xs text-ink-soft">({product.ratingCount})</span>
              </>
            )}
            {product.discountPercentage > 0 && (
              <span className="text-xs text-ink-soft line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <p
            className={`mt-1 text-xs font-medium ${
              stock.variant === "danger"
                ? "text-danger"
                : stock.variant === "warning"
                  ? "text-warning"
                  : "text-success"
            }`}
          >
            {stock.label}
          </p>
        </Link>
      </div>

      {quickViewOpen && (
        <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />
      )}
    </>
  );
}
