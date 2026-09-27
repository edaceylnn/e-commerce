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
    <section className="mt-12 border-t border-line pt-10">
      <h2 className="font-display text-2xl">Bunları da beğenebilirsin</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
        {products.map((product) => {
          const discounted =
            product.price * (1 - product.discountPercentage / 100);
          return (
            <Link key={product.id} href={`/products/${product.id}`} className="group">
              <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
                <Image
                  src={product.thumbnail}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-2 truncate text-body-sm font-medium">{product.title}</p>
              <p className="font-mono text-body-sm font-medium">{formatPrice(discounted)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
