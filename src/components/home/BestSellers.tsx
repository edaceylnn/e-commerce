import Link from "next/link";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

// The eight best sellers across the store, right under the hero. No
// category tabs: categories are browsed further down (Shop by category).
export function BestSellers({ products }: { products: Product[] }) {
  return (
    <section className="page-x pt-[120px]">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-6">
        <h2 className="text-body-sm uppercase tracking-eyebrow">Çok Satanlar</h2>
        <Link href="/products" className="text-cta tracking-label">
          Tümünü gör
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-9 tab:grid-cols-3 tab:gap-x-2 tab:gap-y-12 desk:grid-cols-4">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
