import Link from "next/link";
import type { ComponentType } from "react";

// The one place active-state styling for account nav is defined — used by
// both the desktop sidebar and the mobile drawer so "only one item active,
// same logic everywhere" can't drift between the two.
export function AccountNavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-transparent text-ink-soft hover:bg-cream-deep/50 hover:text-ink"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </Link>
  );
}
