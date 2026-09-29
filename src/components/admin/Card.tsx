import { ReactNode } from "react";

const PADDING = {
  sm: "p-4",
  md: "p-6",
  lg: "p-7",
} as const;

// Central shell for admin surfaces — premium editorial theme: white card,
// a single 1px border, little to no shadow (never a colored/rose-tinted
// glow), 16px corner radius. `title` is optional: most callers render their
// own heading inside children, but an uppercase eyebrow label can be passed
// instead for the compact list-of-cards pattern (order detail, dashboard).
export function Card({
  title,
  description,
  children,
  className = "",
  padding = "md",
}: {
  title?: string;
  // One short line under the title (e.g. the period a chart covers).
  description?: string;
  children: ReactNode;
  className?: string;
  padding?: keyof typeof PADDING;
}) {
  return (
    <div
      className={`rounded-2xl border border-adm-border bg-adm-surface-card ${PADDING[padding]} ${className}`}
    >
      {title && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">{title}</p>
          {description && <p className="mt-1 text-xs text-adm-text-tertiary">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
