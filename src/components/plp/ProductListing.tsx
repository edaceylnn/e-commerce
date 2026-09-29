"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import type { Facets, ListingContext, ProductFilters, SortKey } from "@/lib/product-filters";
import { SORT_OPTIONS, activeFilterCount, listingHref } from "@/lib/product-filters";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilterDrawer } from "@/components/ProductFilterDrawer";
import { CaretDownIcon, CheckIcon, SlidersHorizontalIcon, XIcon } from "@/components/icons/Ph";

export type ListingTab = { href: string; label: string; count?: number; active: boolean };
export type Chip = { label: string; href: string };
export type Editorial = {
  title: string;
  text: string;
  href: string;
  cta: string;
  image: string;
  imagePosition?: string;
};


// Category page body — design handoff screen 2: sticky
// toolbar (tabs · count · view 3/4 · sort · filter), the inline active-filter
// line, and the product grid with editorial breaks and "load more".
export function ProductListing({
  products,
  tabs,
  chips,
  clearHref,
  facets,
  filters,
  ctx,
  sortKey,
  totalCount,
  resultTotal,
  loadMoreHref,
  pageSize,
  editorials,
}: {
  products: Product[];
  tabs: ListingTab[];
  chips: Chip[];
  clearHref: string;
  facets: Facets;
  filters: ProductFilters;
  ctx: ListingContext;
  sortKey: SortKey;
  /** Unfiltered product count (for the drawer's type options). */
  totalCount: number;
  /** All matches after filters — `products` is only the pages shown so far. */
  resultTotal: number;
  /** Link to the next page ("?sayfa=N+1"), or null when everything is shown. */
  loadMoreHref: string | null;
  pageSize: number;
  /** Banner after the 8th product, 2-col block after the 19th. */
  editorials: { wide?: Editorial; block?: Editorial };
}) {
  const router = useRouter();
  const [dense, setDense] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filterCount = activeFilterCount(filters);
  const filterLabel = `Filtre${filterCount > 0 ? ` (${filterCount})` : ""}`;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Önerilen";
  const countLabel = `${resultTotal} ürün`;

  function pickSort(value: string) {
    setSortOpen(false);
    router.push(listingHref({ ...ctx, sort: value === "onerilen" ? undefined : value }, filters), {
      scroll: false,
    });
  }

  const tabRow = (
    <div className="no-scrollbar flex gap-[30px] overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`flex items-start gap-[3px] whitespace-nowrap border-b pb-[5px] pt-2 text-card uppercase tracking-[0.07em] transition-colors ${
            t.active ? "border-ink text-ink" : "border-transparent text-text-3 hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="-translate-y-[3px] text-[10px] tracking-normal text-text-4">{t.count}</span>
          )}
        </Link>
      ))}
    </div>
  );

  const sortOptions = SORT_OPTIONS.map((o) => (
    <button
      key={o.value}
      type="button"
      role="menuitemradio"
      aria-checked={o.value === sortKey}
      onClick={() => pickSort(o.value)}
      className="flex w-full items-center justify-between px-5 py-3 text-left text-card normal-case tracking-normal hover:bg-cream max-tab:py-3.5 max-tab:text-[13.5px]"
    >
      {o.label}
      <CheckIcon size={14} className={o.value === sortKey ? "opacity-100" : "opacity-0"} />
    </button>
  ));

  // Grid cells: products with editorial breaks spliced in. The server
  // already sends only the pages being shown.
  const cells: ReactNode[] = [];
  products.forEach((p, i) => {
    cells.push(<ProductCard key={p.id} product={p} />);
    if (i === 7 && editorials.wide) cells.push(<WideEditorial key="ed-wide" {...editorials.wide} />);
    if (i === 18 && editorials.block) cells.push(<BlockEditorial key="ed-block" {...editorials.block} />);
  });

  return (
    <>
      {/* Tabs above the toolbar below 1280px. */}
      {tabs.length > 1 && <div className="bleed-gutter mt-10 wide:hidden">{tabRow}</div>}

      <div className="full-bleed sticky top-[108px] z-10 mt-6 border-b border-line bg-background hdr:top-16 wide:mt-10">
        {/* ≥760px toolbar. */}
        <div className="page-x hidden h-14 items-center justify-between gap-8 text-nav uppercase tracking-label tab:flex">
          <div className="min-w-0">
            {tabs.length > 1 ? (
              <>
                <div className="hidden wide:block">{tabRow}</div>
                <span className="text-text-3 wide:hidden">{countLabel}</span>
              </>
            ) : (
              <span className="text-text-3">{countLabel}</span>
            )}
          </div>
          <div className="flex flex-none items-center gap-8">
            {tabs.length > 1 && <span className="hidden text-text-3 wide:inline">{countLabel}</span>}
            <div className="flex items-center gap-3">
              <span className="text-text-3">Görünüm</span>
              {[true, false].map((d) => (
                <button
                  key={String(d)}
                  type="button"
                  onClick={() => setDense(d)}
                  aria-pressed={dense === d}
                  className={`border-b pb-0.5 ${dense === d ? "border-ink text-ink" : "border-transparent text-text-4"}`}
                >
                  <span className="desk:hidden">{d ? 3 : 2}</span>
                  <span className="hidden desk:inline">{d ? 4 : 3}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                className="flex items-center gap-2 uppercase"
              >
                Sırala: {sortLabel}
                <CaretDownIcon size={12} className={`transition-transform duration-300 ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <>
                  <div aria-hidden className="fixed inset-0 z-[5]" onClick={() => setSortOpen(false)} />
                  <div role="menu" className="absolute right-0 top-[34px] z-10 min-w-[220px] border border-line bg-background py-2">
                    {sortOptions}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => setFilterOpen(true)} className="flex items-center gap-2.5 uppercase">
              <SlidersHorizontalIcon size={16} />
              {filterLabel}
            </button>
          </div>
        </div>

        {/* Mobile: Filter | Sort, sort options expand inline. */}
        <div className="grid h-[50px] grid-cols-2 text-nav uppercase tracking-label tab:hidden">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex items-center justify-center gap-2 border-r border-line uppercase"
          >
            <SlidersHorizontalIcon size={16} />
            {filterLabel}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            aria-expanded={sortOpen}
            className="flex items-center justify-center gap-2 uppercase"
          >
            Sırala
            <CaretDownIcon size={12} className={`transition-transform duration-300 ${sortOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        {sortOpen && (
          <div role="menu" className="border-t border-line py-1.5 tab:hidden">
            {sortOptions}
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-1.5 pt-5 text-card">
          <span className="text-text-3">Filtreler</span>
          {chips.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              scroll={false}
              aria-label={`${c.label} filtresini kaldır`}
              className="flex items-center gap-1.5 py-1.5 transition-colors hover:text-text-3"
            >
              {c.label}
              <XIcon size={10} className="text-text-3" />
            </Link>
          ))}
          <Link href={clearHref} scroll={false} className="py-1.5 text-text-3 underline underline-offset-[3px]">
            Tümünü temizle
          </Link>
        </div>
      )}

      <section className={chips.length > 0 ? "pt-8" : "pt-10"}>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pb-20 pt-[120px] text-center">
            <span className="text-[28px] font-light tracking-[-0.01em]">Bu filtrelere uyan ürün yok</span>
            <span className="text-body font-light text-ink-soft">
              Daha fazla sonuç için bir beden ya da rengi kaldırmayı dene.
            </span>
            <Link href={clearHref} scroll={false} className="text-cta mt-3">
              Filtreleri temizle
            </Link>
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-x-1.5 gap-y-9 tab:gap-x-2 tab:gap-y-14 ${
                dense ? "tab:grid-cols-3 desk:grid-cols-4" : "tab:grid-cols-2 desk:grid-cols-3"
              }`}
            >
              {cells}
            </div>
            <div className="flex flex-col items-center gap-5 pt-24">
              <span className="text-nav uppercase tracking-label text-text-3">
                {products.length} / {resultTotal} ürün gösteriliyor
              </span>
              {loadMoreHref && (
                <Link
                  href={loadMoreHref}
                  scroll={false}
                  className="flex h-12 items-center border border-ink px-11 text-nav uppercase tracking-cta transition-colors hover:bg-ink hover:text-background"
                >
                  {Math.min(pageSize, resultTotal - products.length)} ürün daha göster
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      <ProductFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        facets={facets}
        filters={filters}
        ctx={ctx}
        resultCount={resultTotal}
        totalCount={totalCount}
      />
    </>
  );
}

function WideEditorial({ title, text, href, cta, image, imagePosition }: Editorial) {
  return (
    <div className="relative col-span-full aspect-[16/9] bg-[#6f675c] tab:my-6 tab:aspect-[21/9]">
      <Image src={image} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: imagePosition }} />
      <div className="pointer-events-none absolute inset-0 bg-scrim" />
      <div className="absolute bottom-5 left-5 right-5 flex max-w-[420px] flex-col gap-3.5 text-on-image tab:bottom-10 tab:left-10">
        <span className="headline text-[clamp(28px,3vw,46px)] leading-[1.05]">{title}</span>
        <span className="text-body font-light">{text}</span>
        <Link href={href} className="text-cta mt-1 self-start">
          {cta}
        </Link>
      </div>
    </div>
  );
}

function BlockEditorial({ title, text, href, cta, image, imagePosition }: Editorial) {
  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-1.5">
      <div className="relative mb-2.5 aspect-[4/3] bg-image-alt">
        <Image src={image} alt="" fill sizes="50vw" className="object-cover" style={{ objectPosition: imagePosition }} />
      </div>
      <span className="text-card uppercase tracking-label">{title}</span>
      <span className="text-card text-text-3">{text}</span>
      <Link
        href={href}
        className="self-start border-b border-disabled pb-0.5 text-card text-ink-soft transition-colors hover:border-ink"
      >
        {cta}
      </Link>
    </div>
  );
}
