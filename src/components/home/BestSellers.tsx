"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import { TextTabs } from "@/components/home/TextTabs";

const TABS = [{ value: "all", label: "Tümü" }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))];

export function BestSellers({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<string>("all");
  const shown = products.filter((p) => tab === "all" || p.category === tab).slice(0, 8);

  return (
    <section className="page-x pt-40">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-6">
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <h2 className="text-body-sm uppercase tracking-eyebrow">Çok Satanlar</h2>
          <TextTabs label="Kategoriye göre filtrele" options={TABS} value={tab} onChange={setTab} />
        </div>
        <Link href="/products" className="text-cta tracking-label">
          Tümünü gör
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-9 tab:grid-cols-3 tab:gap-x-2 tab:gap-y-12 desk:grid-cols-4">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
