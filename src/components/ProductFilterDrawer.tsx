"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Facets, ListingContext, ProductFilters } from "@/lib/product-filters";
import { EMPTY_FILTERS, activeFilterCount, listingHref, typeLabel } from "@/lib/product-filters";
import { SWATCH_RING } from "@/lib/product-view";
import { Drawer } from "@/components/ui/Drawer";
import { CaretDownIcon, CheckIcon } from "@/components/icons/Ph";

// Design handoff → filter drawer: collapsible sections, 15px square
// checkboxes with counts, plain-letter sizes, a 2-column colour grid, and
// "Tümünü temizle" / "N ürünü göster" in the footer. Filtering is live:
// every change replaces the URL (which the server page parses), and the
// local draft keeps the controls responsive while that round-trip runs.
export function ProductFilterDrawer({
  open,
  onClose,
  facets,
  filters,
  ctx,
  resultCount,
  totalCount,
}: {
  open: boolean;
  onClose: () => void;
  facets: Facets;
  filters: ProductFilters;
  ctx: ListingContext;
  resultCount: number;
  /** Products in the unfiltered list; a type matching all of them can't
   *  narrow anything, so it isn't offered. */
  totalCount: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(filters);
  // Re-sync when the URL's filters change from outside (chip removal,
  // "clear all" link) — React's adjust-state-on-prop-change pattern.
  const filtersKey = JSON.stringify(filters);
  const [syncedKey, setSyncedKey] = useState(filtersKey);
  if (filtersKey !== syncedKey) {
    setSyncedKey(filtersKey);
    setDraft(filters);
  }

  const [openSections, setOpenSections] = useState(new Set(["size", "color", "type"]));
  const priceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(priceTimer.current), []);

  function apply(next: ProductFilters) {
    setDraft(next);
    router.replace(listingHref(ctx, next), { scroll: false });
  }

  function toggle<K extends "sizes" | "colors" | "types">(key: K, value: string) {
    const list = draft[key];
    apply({ ...draft, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  function setPrice(key: "minPrice" | "maxPrice", raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    const next = { ...draft, [key]: Number.isFinite(value) ? value : undefined };
    setDraft(next);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => apply(next), 450);
  }

  const toggleSection = (key: string) =>
    setOpenSections((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const typeOptions = facets.types.filter(
    (t) => t.count < totalCount || draft.types.includes(t.value)
  );
  const count = activeFilterCount(draft);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Filtre${count > 0 ? ` (${count})` : ""}`}
      footer={
        <div className="grid grid-cols-[1fr_1.6fr] gap-2">
          <button
            type="button"
            onClick={() =>
              // Keep URL-only filters (brand, skin type, rating) the drawer doesn't show.
              apply({ ...EMPTY_FILTERS, brands: draft.brands, skinTypes: draft.skinTypes, minRating: draft.minRating })
            }
            className="h-[50px] border border-line-strong text-nav uppercase tracking-cta transition-colors hover:border-ink"
          >
            Tümünü temizle
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-[50px] bg-ink text-nav uppercase tracking-cta text-background transition-colors hover:bg-ink-hover"
          >
            {resultCount} ürünü göster
          </button>
        </div>
      }
    >
      {facets.sizes.length > 0 && (
        <Section title="Beden" id="size" open={openSections.has("size")} onToggle={toggleSection}>
          <div className="-ml-2.5 flex flex-wrap gap-1">
            {facets.sizes.map((s) => {
              const on = draft.sizes.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle("sizes", s.value)}
                  className="flex h-11 min-w-12 items-center justify-center px-2 text-[13.5px]"
                >
                  <span className={`border-b pb-[3px] ${on ? "border-ink font-medium" : "border-transparent font-light"}`}>
                    {s.value}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets.colors.length > 0 && (
        <Section title="Renk" id="color" open={openSections.has("color")} onToggle={toggleSection}>
          <div className="grid grid-cols-2 gap-x-4">
            {facets.colors.map((c) => {
              const on = draft.colors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle("colors", c.value)}
                  className="flex min-h-10 items-center gap-3 text-left text-[13.5px]"
                >
                  <span
                    className={`h-3.5 w-3.5 flex-none rounded-full border border-ink/20 ${on ? SWATCH_RING : ""}`}
                    style={{ background: c.hex }}
                  />
                  <span className={`flex-1 ${on ? "font-medium" : "font-light"}`}>{c.value}</span>
                  <span className="text-[12px] text-text-4">{c.count}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets.priceMax > facets.priceMin && (
        <Section title="Fiyat" id="price" open={openSections.has("price")} onToggle={toggleSection}>
          <div className="flex items-end gap-4">
            <PriceField
              label="En az"
              placeholder={`₺${facets.priceMin}`}
              value={draft.minPrice}
              onChange={(v) => setPrice("minPrice", v)}
            />
            <span aria-hidden className="pb-3 text-text-4">
              –
            </span>
            <PriceField
              label="En çok"
              placeholder={`₺${facets.priceMax}`}
              value={draft.maxPrice}
              onChange={(v) => setPrice("maxPrice", v)}
            />
          </div>
        </Section>
      )}

      {typeOptions.length > 0 && (
        <Section title="Ürün tipi" id="type" open={openSections.has("type")} onToggle={toggleSection}>
          {typeOptions.map((t) => (
            <CheckOption
              key={t.value}
              label={typeLabel(t.value)}
              count={t.count}
              checked={draft.types.includes(t.value)}
              onChange={() => toggle("types", t.value)}
            />
          ))}
        </Section>
      )}

      <Section title="Stok durumu" id="stock" open={openSections.has("stock")} onToggle={toggleSection}>
        <CheckOption
          label="Sadece stokta olanlar"
          checked={draft.inStockOnly}
          onChange={() => apply({ ...draft, inStockOnly: !draft.inStockOnly })}
        />
      </Section>
    </Drawer>
  );
}

function Section({
  title,
  id,
  open,
  onToggle,
  children,
}: {
  title: string;
  id: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex h-[60px] w-full items-center justify-between text-nav uppercase tracking-cta"
      >
        {title}
        <CaretDownIcon size={13} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="flex flex-col pb-5">{children}</div>}
    </div>
  );
}

function CheckOption({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3.5 text-[13.5px] font-light">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={`flex h-[15px] w-[15px] flex-none items-center justify-center border text-background peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
          checked ? "border-ink bg-ink" : "border-line-strong"
        }`}
      >
        <CheckIcon size={11} className={checked ? "opacity-100" : "opacity-0"} />
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[12px] text-text-4">{count}</span>}
    </label>
  );
}

function PriceField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: number | undefined;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-caption uppercase tracking-label text-text-3">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 border-b border-line-strong bg-transparent py-2.5 text-[14px] font-light outline-none placeholder:text-text-4 focus:border-ink"
      />
    </label>
  );
}
