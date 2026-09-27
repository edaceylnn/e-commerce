"use client";

import type { ProductVariantSummary } from "@/lib/products";

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariantSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const selected = variant.id === selectedId;
        const outOfStock = variant.stock === 0;
        return (
          <button
            key={variant.id}
            type="button"
            disabled={outOfStock}
            onClick={() => onSelect(variant.id)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              selected
                ? "border-ink bg-ink text-cream"
                : "border-line text-ink hover:border-ink"
            } ${outOfStock ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {variant.label}
            {outOfStock ? " (Tükendi)" : ""}
          </button>
        );
      })}
    </div>
  );
}
