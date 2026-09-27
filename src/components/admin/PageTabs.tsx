import { ReactNode } from "react";
import Link from "next/link";
import { CountBadge } from "@/components/admin/CountBadge";

export type PageTab = {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
};

type TabsSize = "sm" | "md";

// One filter's worth of state, laid out as segments of a single bounded
// control — not a row of separate buttons. This is the reusable tab/filter
// system for every admin list screen (ürün/sipariş/müşteri/kampanya/stok
// durumları, rapor periyotları, …): pass hrefs that carry the filter in the
// URL (how every current caller already works, so no filtering logic
// changes) and this renders the segmented look, active pill, counts and
// disabled state consistently everywhere.
const SIZE_CLASS: Record<TabsSize, { shell: string; tab: string }> = {
  sm: { shell: "p-0.5", tab: "px-2.5 py-1 text-[12.5px]" },
  md: { shell: "p-1", tab: "px-3.5 py-1.5 text-[13px]" },
};

export function PageTabs({
  tabs,
  actions,
  bare = false,
  size = "sm",
}: {
  tabs: PageTab[];
  actions?: ReactNode;
  // true when a parent already provides the surrounding card/divider (the
  // Products page's unified table card) — false keeps the standalone
  // bottom-border/margin every other PageTabs caller (Orders, ...) relies on.
  bare?: boolean;
  // Admin list screens default to the compact "sm" segment size — same
  // radius/spacing family as Button/Input/Select, just one notch tighter
  // since a filter row usually sits above a dense table.
  size?: TabsSize;
}) {
  const { shell, tab: tabClass } = SIZE_CLASS[size];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        bare ? "" : "mb-5 border-b border-adm-border pb-5"
      }`}
    >
      {/* This is a filter that swaps the page's query string, not a
          same-page tabpanel switch — so it's a nav-style link group
          (aria-current on the active item), not role="tablist"/"tab". */}
      <div
        className={`inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-adm-border bg-adm-surface-secondary/50 ${shell}`}
      >
        {tabs.map((tab) => {
          const content = (
            <>
              {tab.label}
              {typeof tab.count === "number" && (
                <CountBadge inverse={tab.active} className="ml-1.5">
                  {tab.count}
                </CountBadge>
              )}
            </>
          );

          if (tab.disabled) {
            return (
              <span
                key={tab.href}
                aria-disabled="true"
                className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg font-semibold text-adm-text-tertiary opacity-50 ${tabClass}`}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "true" : undefined}
              className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-primary/30 ${tabClass} ${
                tab.active
                  ? "bg-adm-primary text-white"
                  : "text-adm-text-secondary hover:bg-adm-surface-card/70 hover:text-adm-text"
              }`}
            >
              {content}
            </Link>
          );
        })}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
