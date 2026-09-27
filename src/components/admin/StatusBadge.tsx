import { ReactNode } from "react";

export type StatusBadgeVariant = "success" | "warning" | "danger" | "info" | "purple" | "neutral";
export type StatusBadgeSize = "sm" | "md";

// Subtle, semantic-only badges — a soft tinted background with a matching
// dot, never a bright filled pill. Neutral covers non-semantic tags (e.g.
// category labels) so we don't invent a color per category. Deliberately
// quiet: a badge answers "what state is this row in", it isn't meant to be
// the thing your eye lands on first.
const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  success: "bg-adm-success-soft text-adm-success",
  warning: "bg-adm-warning-soft text-adm-warning",
  danger: "bg-adm-danger-soft text-adm-danger",
  info: "bg-adm-info-soft text-adm-info",
  purple: "bg-adm-purple-soft text-adm-purple",
  neutral: "bg-adm-surface-secondary text-adm-text-secondary",
};

const DOT_CLASSES: Record<StatusBadgeVariant, string> = {
  success: "bg-adm-success",
  warning: "bg-adm-warning",
  danger: "bg-adm-danger",
  info: "bg-adm-info",
  purple: "bg-adm-purple",
  neutral: "bg-adm-text-tertiary",
};

// sm is the table-row default — a badge should never be taller than the
// text sitting next to it in the same cell. md is for standalone contexts
// (a page header next to an h1, a hero card) where a touch more presence
// is fine.
const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  sm: "gap-1 px-1.5 py-0.5 text-[11px]",
  md: "gap-1.5 px-2.5 py-1 text-xs",
};

export function StatusBadge({
  children,
  variant = "neutral",
  size = "md",
  showDot = true,
  dot,
  className = "",
}: {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  // `dot` is an alias for `showDot` — either name reads fine at a call site
  // ("dot={false}" vs "showDot={false}"), only one needs to be false to hide it.
  showDot?: boolean;
  dot?: boolean;
  className?: string;
}) {
  const renderDot = showDot && dot !== false;
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md font-semibold leading-none ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {renderDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[variant]}`} />}
      {children}
    </span>
  );
}
