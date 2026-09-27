"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/lib/store/cart-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { formatPrice } from "@/lib/format";

export type CartLineStock = {
  stock: number;
  active: boolean;
  /** The product's current title and photo — preferred over what the cart
   *  stored at add-to-cart time, which goes stale when a product is renamed
   *  or its photo changes. */
  title?: string | null;
  thumbnail?: string | null;
};

const STOCK_DOT = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

function stockStatus(info: CartLineStock | undefined) {
  if (!info) return null;
  if (!info.active || info.stock <= 0) {
    return { variant: "danger" as const, label: "Tükendi" };
  }
  if (info.stock <= 5) {
    return { variant: "warning" as const, label: `Son ${info.stock} ürün` };
  }
  return { variant: "success" as const, label: "Stokta" };
}

const QTY_BUTTON =
  "flex h-9 w-9 items-center justify-center font-mono text-sm transition hover:bg-cream-deep focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

const SECONDARY_ACTION =
  "text-xs text-ink-soft underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-40";

// One cart row: a 3:4 photo, the product's identity (name, variant, stock)
// beside it with the secondary actions directly underneath, and price +
// quantity aligned right. Rows are separated by the list's hairlines rather
// than framed as cards. The photo is pinned to 3:4 (self-start) so a taller
// text column can't stretch it. On mobile the price and the quantity stepper
// share one line under the details, above the secondary actions.
export function CartLineItem({
  item,
  stockInfo,
}: {
  item: CartItem;
  stockInfo?: CartLineStock;
}) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const wishlistAdd = useWishlistStore((s) => s.add);
  const router = useRouter();

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [movingToWishlist, setMovingToWishlist] = useState(false);

  const status = stockStatus(stockInfo);
  const title = stockInfo?.title || item.title;
  const thumbnail = stockInfo?.thumbnail || item.thumbnail;
  const lineTotal = item.price * item.quantity;
  const compareAt =
    item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice : null;

  function handleDecrement() {
    if (item.quantity === 1) {
      setConfirmingRemove(true);
      return;
    }
    setQuantity(item.id, item.quantity - 1, item.variantId);
  }

  function handleRemove() {
    removeItem(item.id, item.variantId);
  }

  async function handleMoveToWishlist() {
    setMovingToWishlist(true);
    wishlistAdd(item.id);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: item.id }),
    });
    setMovingToWishlist(false);
    if (res.status === 401) {
      router.push("/account");
      return;
    }
    removeItem(item.id, item.variantId);
  }

  const quantityControl = confirmingRemove ? (
    <div className="flex h-9 items-center gap-3 text-xs">
      <span className="text-ink-soft">Kaldırılsın mı?</span>
      <button type="button" onClick={handleRemove} className="font-semibold text-ink underline underline-offset-4">
        Evet
      </button>
      <button type="button" onClick={() => setConfirmingRemove(false)} className="text-ink-soft hover:text-ink">
        Vazgeç
      </button>
    </div>
  ) : (
    <div className="flex items-center border border-line-strong">
      <button type="button" onClick={handleDecrement} aria-label="Adedi azalt" className={QTY_BUTTON}>
        −
      </button>
      <span className="w-8 text-center font-mono text-sm" aria-live="polite">
        {item.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(item.id, item.quantity + 1, item.variantId)}
        aria-label="Adedi artır"
        className={QTY_BUTTON}
      >
        +
      </button>
    </div>
  );

  const price = (
    <div className="text-right">
      <p className="font-mono text-sm font-medium">{formatPrice(lineTotal)}</p>
      {compareAt && (
        <p className="mt-0.5 font-mono text-caption text-ink-soft line-through">
          {formatPrice(compareAt * item.quantity)}
        </p>
      )}
    </div>
  );

  return (
    <li className="flex gap-4 py-4 sm:gap-5 sm:py-5">
      <Link
        href={`/products/${item.id}`}
        className="relative aspect-[3/4] w-24 shrink-0 self-start overflow-hidden bg-cream-deep sm:w-27"
      >
        <Image src={thumbnail} alt={title} fill sizes="108px" className="object-cover object-top" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <Link href={`/products/${item.id}`} className="text-sm font-medium hover:underline hover:underline-offset-4">
              {title}
            </Link>
            {item.quantity > 1 && (
              <p className="mt-0.5 font-mono text-xs text-ink-soft">{formatPrice(item.price)} / adet</p>
            )}
            {(item.variantLabel || status) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                {item.variantLabel && <span>{item.variantLabel}</span>}
                {status && (
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STOCK_DOT[status.variant]}`} />
                    <span className={status.variant === "success" ? "" : "font-medium text-ink"}>
                      {status.label}
                    </span>
                    {status.variant === "warning" && <span>· Sepetinizde rezerve edilmez</span>}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Desktop: price and quantity stacked on the right. */}
          <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
            {price}
            {quantityControl}
          </div>
        </div>

        {/* Mobile: quantity left, price right, on one line of their own. */}
        <div className="mt-3 flex items-center justify-between gap-4 sm:hidden">
          {quantityControl}
          {price}
        </div>

        <div className="mt-3 flex items-center gap-5">
          <button type="button" onClick={handleMoveToWishlist} disabled={movingToWishlist} className={SECONDARY_ACTION}>
            Favorilere taşı
          </button>
          <button type="button" onClick={handleRemove} className={SECONDARY_ACTION}>
            Kaldır
          </button>
        </div>
      </div>
    </li>
  );
}
