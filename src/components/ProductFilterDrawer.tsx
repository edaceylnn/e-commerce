"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProductFilters, Facets } from "@/lib/product-filters";
import { hasActiveFilters, typeLabel } from "@/lib/product-filters";

const FIELD =
  "h-10 w-full border border-line-strong bg-field px-3 text-base text-ink outline-none transition focus:border-ink sm:text-sm";
const CHECK = "h-4 w-4 accent-[var(--ink)]";

// "Filtrele" button + a right-hand side panel built on a native <dialog>
// (focus containment, Esc to close and a backdrop for free). The panel holds
// the same plain GET form as before — submitting it navigates with the
// filters as query params, which src/lib/product-filters.ts parses — so the
// filtering logic itself is unchanged.
export function ProductFilterDrawer({
  facets,
  activeFilters,
  totalCount,
  preserved,
  clearHref,
}: {
  facets: Facets;
  activeFilters: ProductFilters;
  /** Products in the unfiltered list; a type option matching all of them
   *  can't narrow anything, so it isn't offered. */
  totalCount: number;
  /** Non-filter params (category, q, filter, sort) the form must carry over. */
  preserved: Record<string, string | undefined>;
  clearHref: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const activeCount =
    activeFilters.types.length +
    (activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined ? 1 : 0) +
    (activeFilters.inStockOnly ? 1 : 0);

  const typeOptions = facets.types.filter(
    (t) => t.count < totalCount || activeFilters.types.includes(t.value)
  );
  const hasPriceRange = facets.priceMax > facets.priceMin;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // Keep the page behind the panel from scrolling while it's open.
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Same remount-on-change reasoning as before: uncontrolled inputs only read
  // defaultValue/defaultChecked on mount.
  const formKey = JSON.stringify({ preserved, activeFilters });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-ink transition hover:text-accent"
      >
        <FilterIcon />
        Filtrele
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 font-mono text-caption text-background">
            {activeCount}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the backdrop lands on the <dialog> element itself.
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-labelledby="filter-panel-title"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-sm bg-background p-0 text-ink backdrop:bg-ink/40 open:flex"
      >
        <form
          key={formKey}
          method="GET"
          action="/products"
          className="flex h-full w-full flex-col"
        >
          {Object.entries(preserved).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null
          )}

          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <h2 id="filter-panel-title" className="font-display text-2xl">
              Filtrele
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Filtreleri kapat"
              className="flex h-9 w-9 items-center justify-center text-ink-soft transition hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {hasPriceRange && (
              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-label">Fiyat</legend>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="minPrice"
                    min={0}
                    inputMode="numeric"
                    placeholder={`₺${facets.priceMin}`}
                    defaultValue={activeFilters.minPrice ?? ""}
                    aria-label="En düşük fiyat"
                    className={FIELD}
                  />
                  <span aria-hidden className="text-ink-soft">-</span>
                  <input
                    type="number"
                    name="maxPrice"
                    min={0}
                    inputMode="numeric"
                    placeholder={`₺${facets.priceMax}`}
                    defaultValue={activeFilters.maxPrice ?? ""}
                    aria-label="En yüksek fiyat"
                    className={FIELD}
                  />
                </div>
              </fieldset>
            )}

            {typeOptions.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-label">Ürün tipi</legend>
                <div className="space-y-3">
                  {typeOptions.map((t) => (
                    <label key={t.value} className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        name="type"
                        value={t.value}
                        defaultChecked={activeFilters.types.includes(t.value)}
                        className={CHECK}
                      />
                      {typeLabel(t.value)}
                      <span className="ml-auto font-mono text-xs text-ink-soft">{t.count}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase tracking-label">Stok</legend>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="inStock"
                  value="1"
                  defaultChecked={activeFilters.inStockOnly}
                  className={CHECK}
                />
                Sadece stokta olanlar
              </label>
            </fieldset>

            {/* Filters that can arrive via URL but aren't offered in this
                panel any more — kept so submitting doesn't silently drop them. */}
            {activeFilters.brands.map((b) => (
              <input key={`brand-${b}`} type="hidden" name="brand" value={b} />
            ))}
            {activeFilters.skinTypes.map((s) => (
              <input key={`skin-${s}`} type="hidden" name="skinType" value={s} />
            ))}
            {activeFilters.minRating !== undefined && (
              <input type="hidden" name="rating" value={activeFilters.minRating} />
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-6 py-5">
            {hasActiveFilters(activeFilters) ? (
              <Link
                href={clearHref}
                className="text-xs text-ink-soft underline underline-offset-4 transition hover:text-ink"
              >
                Tümünü temizle
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="submit"
              className="ml-auto bg-ink px-8 py-3.5 text-xs font-semibold uppercase tracking-label text-background transition hover:bg-primary-dark hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              Uygula
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-5 w-5" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
