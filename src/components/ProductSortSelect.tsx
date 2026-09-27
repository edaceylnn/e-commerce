"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/product-filters";

// Quiet "SIRALA: Önerilen ▾" control for the listing toolbar — a native
// <select> (keyboard and screen-reader friendly) without a pill frame.
export function ProductSortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "onerilen") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-label">
      <span aria-hidden className="hidden text-ink-soft sm:inline">Sırala</span>
      <select
        value={value}
        onChange={handleChange}
        aria-label="Sırala"
        // field-sizing: size to the chosen option, not the longest one.
        className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold uppercase text-ink outline-none [field-sizing:content] transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" aria-hidden className="pointer-events-none absolute right-0 h-3 w-3 text-ink">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </label>
  );
}
