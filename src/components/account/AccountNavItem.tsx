import Link from "next/link";

// The one place active-state styling for account nav is defined. Design
// handoff → Account: plain text rows; the active one is weight 500 with a
// 14px rule before it. On mobile the same items become a scrolling tab row.
export function AccountNavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 whitespace-nowrap py-2 text-[13.5px] transition-colors max-tab:border-b max-tab:pb-1.5 ${
        active
          ? "font-medium text-ink max-tab:border-ink"
          : "text-ink-soft hover:text-ink max-tab:border-transparent"
      }`}
    >
      <span
        aria-hidden
        className={`hidden h-px w-3.5 tab:block ${active ? "bg-ink" : "bg-transparent"}`}
      />
      {label}
    </Link>
  );
}
