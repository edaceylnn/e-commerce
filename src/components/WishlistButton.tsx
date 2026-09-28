"use client";

import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { showToast } from "@/lib/store/toast-store";
import { HeartPhIcon } from "@/components/icons/Ph";

export function WishlistButton({
  productId,
  showLabel = false,
  iconSize = 20,
  className = "flex h-11 w-11 items-center justify-center text-ink",
}: {
  productId: number;
  showLabel?: boolean;
  iconSize?: number;
  className?: string;
}) {
  const router = useRouter();
  const isWishlisted = useWishlistStore((s) => s.ids.has(productId));
  const add = useWishlistStore((s) => s.add);
  const remove = useWishlistStore((s) => s.remove);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      remove(productId);
      await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      return;
    }

    add(productId);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (res.status === 401) {
      remove(productId);
      router.push("/account");
      return;
    }
    showToast("Favorilere eklendi");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isWishlisted ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={isWishlisted}
      data-saved={isWishlisted || undefined}
      className={className}
    >
      <HeartPhIcon size={iconSize} weight={isWishlisted ? "fill" : "light"} />
      {showLabel && <span>{isWishlisted ? "Favorilerde" : "Favorilere ekle"}</span>}
    </button>
  );
}
