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

// Design handoff: underline-only fields on the page colour — no box, no
// fill. `surface` is kept for call-site compatibility; both surfaces now
// render the same.
export function fieldInputClass(hasError = false, _surface: FieldSurface = "background"): string {
  void _surface;
  return `h-11 w-full rounded-none border-0 border-b ${hasError ? "border-sale" : "border-line-strong"} bg-transparent px-0 text-base font-light text-ink outline-none transition-colors placeholder:text-text-4 focus:border-ink tab:text-[14px]`;
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
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={htmlFor} className="block text-caption uppercase tracking-label text-text-3">
        {label}
        {required && " *"}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-sale">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-text-4">{hint}</p>
      ) : null}
    </div>
  );
}
