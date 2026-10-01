import { ReactNode } from "react";
import Link from "next/link";

export type PageTab = {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
};

type TabsSize = "sm" | "md";

// One filter's worth of state as a row of pills: the active one filled,
// the rest on a soft tint — the reusable tab/filter system for every admin
// list screen (sipariş/müşteri/yorum durumları, …). Pass hrefs that carry
// the filter in the URL; this renders the pills, counts and disabled state
// the same everywhere.
const SIZE_CLASS: Record<TabsSize, string> = {
  sm: "px-3 py-1 text-[12.5px]",
  // Same overall height as the search/select controls under it.
  md: "px-4 py-2 text-sm",
};

export function PageTabs({
  tabs,
  actions,
  bare = false,
  size = "md",
}: {
  tabs: PageTab[];
  actions?: ReactNode;
  // true when a parent already provides the surrounding card/divider —
  // false keeps the standalone bottom-border/margin.
  bare?: boolean;
  size?: TabsSize;
}) {
  const pill = `inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ${SIZE_CLASS[size]}`;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        bare ? "" : "mb-5 border-b border-adm-border pb-5"
      }`}
    >
      {/* This is a filter that swaps the page's query string, not a
          same-page tabpanel switch — so it's a nav-style link group
          (aria-current on the active item), not role="tablist"/"tab". */}
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const content = (
            <>
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="ml-1.5 tabular-nums opacity-60">{tab.count}</span>
              )}
            </>
          );

          if (tab.disabled) {
            return (
              <span
                key={tab.href}
                aria-disabled="true"
                className={`${pill} bg-adm-surface-secondary text-adm-text-tertiary opacity-50`}
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
              className={`${pill} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-primary/30 ${
                tab.active
                  ? "bg-adm-primary text-adm-on-primary"
                  : "bg-adm-surface-secondary text-adm-text-secondary hover:bg-adm-surface-tertiary hover:text-adm-text"
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
