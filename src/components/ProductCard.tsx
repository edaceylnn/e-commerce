import Link from "next/link";
import Image from "next/image";
import { isNewProduct, type Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import { QuickAddButton } from "@/components/QuickAddButton";
import { WishlistButton } from "@/components/WishlistButton";

const BADGE_STYLES = {
  Yeni: "bg-ink text-background",
  "İndirimde": "bg-accent text-accent-ink",
  "Çok Satan": "bg-ink text-background",
  "Editörün Seçimi": "bg-ivory text-ink",
} as const;

type Badge = keyof typeof BADGE_STYLES;

function autoBadge(product: Product): Badge | null {
  if (isNewProduct(product)) return "Yeni";
  if (product.discountPercentage >= 20) return "İndirimde";
  if (product.rating >= 4.7) return "Çok Satan";
  return null;
}

const HOVER_ICON_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-full bg-ivory text-ink shadow-md transition hover:bg-accent hover:text-cream";

export function ProductCard({
  product,
  badge,
}: {
  product: Product;
  /** Override the auto-detected badge, e.g. "Editörün Seçimi" for a curated pick. */
  badge?: Badge | null;
}) {
  const discounted = product.price * (1 - product.discountPercentage / 100);
  const resolvedBadge = badge === undefined ? autoBadge(product) : badge;

  return (
    <Link href={`/products/${product.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        {resolvedBadge && (
          <span
            className={`absolute left-2.5 top-2.5 px-2 py-1 font-mono text-caption font-medium uppercase tracking-label ${BADGE_STYLES[resolvedBadge]}`}
          >
            {resolvedBadge}
          </span>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex translate-y-3 justify-center gap-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="pointer-events-auto flex gap-2">
            <QuickAddButton
              id={product.id}
              title={product.title}
              price={discounted}
              thumbnail={product.thumbnail}
              className={HOVER_ICON_CLASS}
            />
            <WishlistButton productId={product.id} className={HOVER_ICON_CLASS} />
          </div>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-body-sm font-medium">{product.title}</h3>
        <span className="shrink-0 font-mono text-body-sm font-medium">
          {formatPrice(discounted)}
        </span>
      </div>
      {(product.volumeLabel || product.skinTypes.length > 0) && (
        <p className="-mt-2 text-caption text-ink-soft">
          {[product.volumeLabel, product.skinTypes[0]].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="-mt-1 flex items-center gap-2">
        {/* Stars only once real approved reviews exist — an empty 0-star row
            (or seeded placeholder ratings) reads as fake social proof. */}
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
    </Link>
  );
}
