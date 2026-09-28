"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/lib/store/cart-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { showToast } from "@/lib/store/toast-store";
import { formatPrice } from "@/lib/format";
import { MinusIcon, PlusIcon } from "@/components/icons/Ph";

export type CartLineStock = {
  stock: number;
  active: boolean;
  /** The product's current title and photo — preferred over what the cart
   *  stored at add-to-cart time, which goes stale when a product is renamed
   *  or its photo changes. */
  title?: string | null;
  thumbnail?: string | null;
};

const MAX_QTY = 10;

const QUIET_ACTION =
  "text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 transition-colors hover:text-ink disabled:opacity-40";

function stockNote(info: CartLineStock | undefined): { text: string; tone: "ok" | "low" | "out" } | null {
  if (!info) return null;
  if (!info.active || info.stock <= 0) return { text: "Tükendi — ödeme öncesi sepetten çıkar.", tone: "out" };
  if (info.stock <= 5) return { text: `Son ${info.stock} ürün. Sepette rezerve edilmez.`, tone: "low" };
  return { text: "Stokta. 1-3 iş günü içinde kargoda.", tone: "ok" };
}

// "M / Krem" (see toProduct in lib/products.ts) → separate size and colour.
function splitVariantLabel(label?: string) {
  if (!label) return null;
  const [size, color] = label.split(" / ");
  return color ? { size, color } : { size: label, color: null };
}

// Design handoff → bag item row: 2:3 image column (200/160/120px), name and
// line total on the top line, unit price below, then colour/size labels, an
// underline quantity stepper (1–10), a stock note and quiet text actions.
export function CartLineItem({
  item,
  stockInfo,
}: {
  item: CartItem;
  stockInfo?: CartLineStock;
}) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const addItem = useCartStore((s) => s.addItem);
  const wishlistAdd = useWishlistStore((s) => s.add);
  const router = useRouter();
  const [movingToWishlist, setMovingToWishlist] = useState(false);

  const title = stockInfo?.title || item.title;
  const thumbnail = stockInfo?.thumbnail || item.thumbnail;
  const variant = splitVariantLabel(item.variantLabel);
  const note = stockNote(stockInfo);
  const compareAt =
    item.compareAtPrice && item.compareAtPrice > item.price ? item.compareAtPrice : null;

  function handleRemove() {
    const snapshot = { ...item };
    removeItem(item.id, item.variantId);
    showToast(`${title} sepetten çıkarıldı`, {
      label: "Geri al",
      onClick: () => {
        const { quantity, ...rest } = snapshot;
        addItem(rest);
        if (quantity > 1) setQuantity(snapshot.id, quantity, snapshot.variantId);
      },
    });
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
    showToast(`${title} favorilere taşındı`);
  }

  return (
    <li className="flex gap-5 border-b border-line py-6 tab:gap-7">
      <Link
        href={`/products/${item.id}`}
        className="relative aspect-[2/3] w-[120px] flex-none self-start bg-cream-deep tab:w-[160px] desk:w-[200px]"
      >
        <Image src={thumbnail} alt={title} fill sizes="200px" className="object-cover object-top" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4 text-[14px]">
          <Link href={`/products/${item.id}`} className="min-w-0">
            {title}
          </Link>
          <span className="flex-none">{formatPrice(item.price * item.quantity)}</span>
        </div>
        <div className="mt-1.5 flex gap-2 text-card">
          <span className={compareAt ? "text-sale" : "text-text-3"}>{formatPrice(item.price)}</span>
          {compareAt && <span className="text-text-4 line-through">{formatPrice(compareAt)}</span>}
        </div>

        <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-4">
          {variant?.color && (
            <div className="flex flex-col gap-1">
              <span className="text-caption uppercase tracking-label text-text-3">Renk</span>
              <span className="flex h-9 items-center text-card">{variant.color}</span>
            </div>
          )}
          {variant && (
            <div className="flex flex-col gap-1">
              <span className="text-caption uppercase tracking-label text-text-3">Beden</span>
              <span className="flex h-9 items-center text-card">{variant.size}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-label text-text-3">Adet</span>
            <div className="flex items-center border-b border-line-strong">
              <button
                type="button"
                onClick={() => setQuantity(item.id, item.quantity - 1, item.variantId)}
                disabled={item.quantity <= 1}
                aria-label="Adedi azalt"
                className="flex h-9 w-8 items-center justify-center text-ink disabled:text-disabled"
              >
                <MinusIcon size={13} />
              </button>
              <span aria-live="polite" className="w-7 text-center text-card">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.id, item.quantity + 1, item.variantId)}
                disabled={item.quantity >= MAX_QTY}
                aria-label="Adedi artır"
                className="flex h-9 w-8 items-center justify-center text-ink disabled:text-disabled"
              >
                <PlusIcon size={13} />
              </button>
            </div>
          </div>
        </div>

        {note && (
          <p className={`mt-4 text-[12px] ${note.tone === "out" ? "text-sale" : "text-text-3"}`}>{note.text}</p>
        )}

        <div className="mt-3 flex gap-5">
          <button type="button" onClick={handleMoveToWishlist} disabled={movingToWishlist} className={QUIET_ACTION}>
            Favorilere taşı
          </button>
          <button type="button" onClick={handleRemove} className={QUIET_ACTION}>
            Kaldır
          </button>
        </div>
      </div>
    </li>
  );
}
