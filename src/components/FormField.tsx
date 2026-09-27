import type { ReactNode } from "react";

// Single source of truth for input sizing across the account area (and
// anywhere else that wants it) — the height/radius/border tokens the brief
// asks to keep consistent. Callers own the actual <input>/<select>; this
// only standardizes its box and the label/error/hint chrome around it.
// 16px text on mobile (sm:14px) — iOS Safari zooms the page into any input
// whose font-size is below 16px. `surface` picks the fill: "background" for
// fields inside a white card, "field" (a touch lighter than the page) for
// forms sitting directly on the cream page.
export type FieldSurface = "background" | "field";

export function fieldInputClass(hasError = false, surface: FieldSurface = "background"): string {
  const fill = surface === "field" ? "bg-field" : "bg-background";
  return `h-11 w-full border ${hasError ? "border-danger" : "border-line-strong"} ${fill} px-3.5 text-base text-ink outline-none transition focus:border-ink sm:text-sm`;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-soft">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
