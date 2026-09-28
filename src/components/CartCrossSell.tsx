"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";

// Deliberately not reusing <ProductCard> here: that component (and its
// isNewProduct import) pulls in "@/lib/products", which drags Prisma/pg into
// the client bundle the moment a Client Component imports it. This is a
// plain client component, so it only needs the handful of primitive fields
// the API route already returns as JSON.
type RelatedProduct = {
  id: number;
  title: string;
  thumbnail: string;
  price: number;
  discountPercentage: number;
};

// Understated cross-sell strip — same category as what's already in the
// cart, minus those products themselves. Renders nothing while loading or
// if there's nothing sensible to suggest, rather than a placeholder.
export function CartCrossSell({ cartProductIds }: { cartProductIds: number[] }) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const idsKey = [...new Set(cartProductIds)].sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetch(`/api/products/related?ids=${idsKey}&limit=4`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setProducts(data?.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!idsKey || products.length === 0) return null;

  return (
    <section className="pt-28">
      <h2 className="mb-7 text-body-sm uppercase tracking-eyebrow">Bunları da beğenebilirsin</h2>
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-9 tab:grid-cols-4 tab:gap-x-2">
        {products.map((product) => {
          const onSale = product.discountPercentage > 0;
          const discounted = product.price * (1 - product.discountPercentage / 100);
          return (
            <Link key={product.id} href={`/products/${product.id}`} className="flex flex-col gap-1.5">
              <div className="relative mb-2.5 aspect-[2/3] bg-cream-deep">
                <Image
                  src={product.thumbnail}
                  alt={product.title}
                  fill
                  sizes="(max-width: 759px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <span className="text-card">{product.title}</span>
              <span className="flex gap-2 text-card">
                <span className={onSale ? "text-sale" : "text-ink-soft"}>{formatPrice(discounted)}</span>
                {onSale && <span className="text-text-4 line-through">{formatPrice(product.price)}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
