"use client";

import { useCartStore } from "@/lib/store/cart-store";
import { ShoppingBagIcon } from "@/components/icons/ShoppingBagIcon";

export function QuickAddButton({
  id,
  title,
  price,
  thumbnail,
  variantId,
  sku,
  className = "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary shadow-md transition hover:bg-primary hover:text-cream",
}: {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  variantId?: string;
  sku?: string;
  className?: string;
}) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <button
      type="button"
      aria-label="Sepete ekle"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem({ id, title, price, thumbnail, variantId, sku });
      }}
      className={className}
    >
      <ShoppingBagIcon className="h-4 w-4" />
    </button>
  );
}
