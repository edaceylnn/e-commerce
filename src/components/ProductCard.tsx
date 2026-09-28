"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
// Type-only: a runtime import would pull @/lib/db (Prisma + pg) into this
// client bundle and break the build on Node-only modules like `dns`.
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import {
  SWATCH_RING,
  colorSwatches,
  discountedPrice,
  imageForColor,
  sizeOptions,
} from "@/lib/product-view";
import { useAddToBag } from "@/lib/use-add-to-bag";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductQuickView } from "@/components/ProductQuickView";
import { PlusIcon } from "@/components/icons/Ph";

// Design handoff → Product card (identical on home, category and "Complete
// the look"): a 2:3 image with no card chrome, a wishlist heart, and — on
// desktop — a quick-add strip of sizes that slides up on hover. Mobile gets
// a "+" button that opens the quick view instead.
export function ProductCard({
  product,
  sizes = "(max-width: 759px) 50vw, (max-width: 1099px) 33vw, 25vw",
  priority = false,
}: {
  product: Product;
  /** `sizes` for next/image — override when the card sits in a narrower column. */
  sizes?: string;
  priority?: boolean;
}) {
  const swatches = colorSwatches(product);
  const [pickedColorId, setPickedColorId] = useState<string | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const addToBag = useAddToBag(product);

  const activeColorId = pickedColorId ?? swatches[0]?.colorId ?? null;
  const options = sizeOptions(product, activeColorId);
  const soldOut = product.stock <= 0 || (options.length > 0 && options.every((o) => !o.available));
  const href = `/products/${product.id}`;
  const onSale = product.discountPercentage > 0;

  return (
    <div className="group/card flex flex-col gap-1.5">
      <div className="relative mb-2.5 aspect-[2/3] overflow-hidden bg-cream-deep">
        {/* Duplicate of the name link below, hidden from AT and tab order. */}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0">
          <Image
            src={imageForColor(product, pickedColorId)}
            alt={product.title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        </Link>

        <WishlistButton
          productId={product.id}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-ink transition-opacity duration-300 aria-pressed:opacity-100 tab:opacity-[.62] tab:group-hover/card:opacity-100"
        />

        {/* Desktop quick-add strip. */}
        <div className="absolute inset-x-0 bottom-0 hidden h-[42px] translate-y-full items-center bg-background/[.78] px-4 opacity-0 transition-[transform,opacity] duration-500 ease-soft group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 group-hover/card:translate-y-0 group-hover/card:opacity-100 tab:flex">
          {soldOut ? (
            <span className="w-full text-center text-caption uppercase tracking-label text-text-3">
              Tükendi
            </span>
          ) : options.length > 0 ? (
            <div className="flex w-full justify-around">
              {options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  disabled={!o.available}
                  onClick={() => addToBag(o.variant)}
                  aria-label={o.available ? `${o.label} beden sepete ekle` : `${o.label} beden tükendi`}
                  className="h-[30px] min-w-[34px] border-b border-transparent text-[12px] text-ink transition-colors enabled:hover:border-ink disabled:cursor-default disabled:text-disabled disabled:line-through"
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToBag(null)}
              aria-label="Sepete ekle"
              className="h-full w-full text-nav uppercase tracking-cta text-ink"
            >
              Sepete ekle
            </button>
          )}
        </div>

        {/* Mobile: "+" opens the quick view (no hover on touch). */}
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          aria-label="Hızlı görünüm"
          className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center text-ink tab:hidden"
        >
          <PlusIcon size={18} />
        </button>
      </div>

      <Link href={href} className="self-start text-card">
        {product.title}
      </Link>
      <div className="flex items-baseline gap-2 text-card">
        <span className={onSale ? "text-sale" : "text-ink-soft"}>
          {formatPrice(discountedPrice(product))}
        </span>
        {onSale && (
          <span className="text-text-4 line-through">{formatPrice(product.price)}</span>
        )}
      </div>

      {swatches.length > 0 && (
        <div className="mt-1 flex items-center gap-[9px]">
          {swatches.map((s) => (
            <button
              key={s.colorId}
              type="button"
              aria-label={s.name}
              aria-pressed={s.colorId === activeColorId}
              title={s.name}
              onClick={() => setPickedColorId(s.colorId)}
              className={`h-[11px] w-[11px] rounded-full border border-ink/20 ${
                s.colorId === activeColorId ? SWATCH_RING : ""
              }`}
              style={{ background: s.hex }}
            />
          ))}
        </div>
      )}

      {quickViewOpen && (
        <ProductQuickView
          product={product}
          initialColorId={activeColorId}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </div>
  );
}
