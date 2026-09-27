"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DATE_RANGE_OPTIONS, type RangeKey } from "@/lib/date-ranges";

// Segmented pill control — a light-gray track with a white active pill,
// not a dropdown. Matches the dashboard's period switcher in the Eylül
// 2026 design deck (7 gün / 30 gün / Yıl); kept as plain buttons + a URL
// param rather than a tab/radio widget since this only ever drives
// navigation, never local state.
export function DateRangeFilter({ value }: { value: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(range: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      role="tablist"
      aria-label="Tarih aralığı"
      className="inline-flex items-center gap-0.5 rounded-full bg-adm-surface-secondary p-1"
    >
      {DATE_RANGE_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => handleSelect(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            value === o.value
              ? "bg-adm-surface-card text-adm-text shadow-sm"
              : "text-adm-text-tertiary hover:text-adm-text-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
