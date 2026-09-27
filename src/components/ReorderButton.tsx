"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";
import type { ReorderLine } from "@/lib/orders";
import { TextButton } from "@/components/account/AccountButtons";

// Adds every line from a past order back into the cart, then sends the
// visitor there — the actual current price/stock is whatever the cart page
// itself resolves live, same as any other add-to-cart.
// `quiet` renders it as a secondary text link (order rows), otherwise the
// standard account text button.
export function ReorderButton({ items, quiet = false }: { items: ReorderLine[]; quiet?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleReorder() {
    setLoading(true);
    for (const item of items) {
      addItem({
        id: item.id,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail,
        variantId: item.variantId,
      });
      if (item.quantity > 1) {
        setQuantity(item.id, item.quantity, item.variantId);
      }
    }
    router.push("/cart");
  }

  const label = loading ? "Sepete ekleniyor…" : "Tekrar Satın Al";
  if (quiet) {
    return (
      <button
        type="button"
        onClick={handleReorder}
        disabled={loading}
        className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
      >
        {label}
      </button>
    );
  }
  return (
    <TextButton onClick={handleReorder} disabled={loading}>
      {label}
    </TextButton>
  );
}
