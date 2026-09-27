"use client";

import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { HeartIcon } from "@/components/icons/HeartIcon";

export function WishlistButton({
  productId,
  showLabel = false,
  className = "absolute right-3 top-14 flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary shadow-md transition hover:bg-primary hover:text-cream",
}: {
  productId: number;
  showLabel?: boolean;
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
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isWishlisted ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={className}
    >
      <HeartIcon filled={isWishlisted} className="h-4 w-4" />
      {showLabel && (
        <span>{isWishlisted ? "Favorilerde ✓" : "Favorilere Ekle"}</span>
      )}
    </button>
  );
}
