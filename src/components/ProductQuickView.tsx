"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { XIcon } from "@/components/icons/Ph";

// Design handoff → quick view modal: 2:3 image beside name, price, colour
// swatches and size boxes; picking a size adds that variant and closes.
export function ProductQuickView({
  product,
  initialColorId = null,
  onClose,
}: {
  product: Product;
  initialColorId?: string | null;
  onClose: () => void;
}) {
  const swatches = colorSwatches(product);
  const [colorId, setColorId] = useState(initialColorId ?? swatches[0]?.colorId ?? null);
  const options = sizeOptions(product, colorId);
  const addToBag = useAddToBag(product);
  const colorName = swatches.find((s) => s.colorId === colorId)?.name;
  const onSale = product.discountPercentage > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5 tab:p-8">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-modal-scrim"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        className="relative grid max-h-full w-full max-w-[900px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] overflow-y-auto bg-background"
      >
        <div className="relative aspect-[2/3] bg-cream-deep">
          <Image
            src={imageForColor(product, colorId)}
            alt={product.title}
            fill
            sizes="(max-width: 759px) 100vw, 450px"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-3.5 px-5 pb-8 pt-10 tab:px-10 tab:pb-10 tab:pt-14">
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-ink"
          >
            <XIcon />
          </button>
          <h2 className="pr-8 text-[28px] font-light leading-[1.15] tracking-[-0.01em]">
            {product.title}
          </h2>
          <div className="flex items-baseline gap-2 text-body">
            <span className={onSale ? "text-sale" : "text-ink-soft"}>
              {formatPrice(discountedPrice(product))}
            </span>
            {onSale && <span className="text-text-4 line-through">{formatPrice(product.price)}</span>}
          </div>

          {swatches.length > 0 && (
            <div className="mt-4 flex items-center gap-2.5">
              {swatches.map((s) => (
                <button
                  key={s.colorId}
                  type="button"
                  aria-label={s.name}
                  aria-pressed={s.colorId === colorId}
                  onClick={() => setColorId(s.colorId)}
                  className={`h-3.5 w-3.5 rounded-full border border-ink/20 ${s.colorId === colorId ? SWATCH_RING : ""}`}
                  style={{ background: s.hex }}
                />
              ))}
              <span className="ml-1.5 text-card text-text-3">{colorName}</span>
            </div>
          )}

          {product.stock <= 0 ? (
            <p className="mt-4 text-nav text-text-4">Bu ürün şu anda tükendi.</p>
          ) : options.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2.5">
              <span className="text-caption uppercase tracking-label text-text-3">Beden seç</span>
              <div className="flex gap-1">
                {options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    disabled={!o.available}
                    onClick={() => {
                      addToBag(o.variant);
                      onClose();
                    }}
                    className="h-11 flex-1 border border-line-strong text-card text-ink transition-colors enabled:hover:border-ink disabled:text-disabled disabled:line-through"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                addToBag(null);
                onClose();
              }}
              className="mt-4 h-[52px] bg-ink text-nav uppercase tracking-[0.16em] text-background transition-colors hover:bg-ink-hover"
            >
              Sepete ekle
            </button>
          )}

          <Link href={`/products/${product.id}`} className="text-cta mt-auto self-start pt-6">
            Ürün detayına git
          </Link>
        </div>
      </div>
    </div>
  );
}
