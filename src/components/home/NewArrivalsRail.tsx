"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons/Ph";

// Horizontal scroll-snap carousel of product cards with arrow buttons.
export function NewArrivalsRail({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <section className="page-x pt-40">
      <div className="mb-7 flex items-baseline justify-between">
        <h2 className="text-body-sm uppercase tracking-eyebrow">Yeni Gelenler</h2>
        <div className="flex items-center gap-7">
          <div className="hidden gap-1 tab:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Önceki"
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:text-text-4"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Sonraki"
              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:text-text-4"
            >
              <ArrowRightIcon />
            </button>
          </div>
          <Link href="/products?filter=new" className="text-cta tracking-label">
            Tümünü gör
          </Link>
        </div>
      </div>
      <div
        ref={railRef}
        // Scrolls inside the page container, so both edges stay on the same
        // line as every other section; a sliver of the next card (1.4 / 3.3 /
        // 4.4 cards per view) signals that it scrolls. overflow-x: auto also
        // clips vertically, so a 4px padding (offset by a -4px margin, keeping
        // cards on the container line) leaves room for the swatch selection
        // ring, which is a box-shadow drawn 3px outside the swatch.
        className="no-scrollbar -m-1 flex snap-x snap-mandatory scroll-px-1 gap-2 overflow-x-auto p-1"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="shrink-0 grow-0 basis-[calc((100%-8px)/1.4)] snap-start tab:basis-[calc((100%-24px)/3.3)] desk:basis-[calc((100%-32px)/4.4)]"
          >
            <ProductCard product={p} sizes="(max-width: 759px) 68vw, 300px" />
          </div>
        ))}
      </div>
    </section>
  );
}
