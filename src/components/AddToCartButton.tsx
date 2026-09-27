"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { PillButton } from "@/components/Pill";

export function AddToCartButton({
  id,
  title,
  price,
  thumbnail,
  variantId,
  sku,
  variantLabel,
  compareAtPrice,
  disabled = false,
}: {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  variantId?: string;
  sku?: string;
  variantLabel?: string;
  compareAtPrice?: number;
  disabled?: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  return (
    <PillButton
      onClick={() => {
        addItem({ id, title, price, thumbnail, variantId, sku, variantLabel, compareAtPrice });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      disabled={disabled}
      className="w-full"
    >
      {disabled ? "Tükendi" : added ? "Sepete eklendi ✓" : "Sepete Ekle"}
    </PillButton>
  );
}
