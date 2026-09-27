import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CONTROL_FOCUS_VISIBLE } from "@/components/admin/controlStyles";

// Shared button language for the whole admin panel — one filled (primary),
// one outlined (secondary), plus ghost/danger for lower-emphasis and
// destructive actions. Every variant shares height/padding/radius/weight so
// swapping variant never shifts layout, and gets the same hover/active/
// focus/disabled treatment for free. Vertical padding + text size per size
// step intentionally mirror controlStyles.ts's CONTROL_SIZE_CLASS (only the
// horizontal padding differs — a filled CTA reads better a little wider
// than an input needs to be) so a button dropped next to an Input/Select
// lines up on the same row height.
const base = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 ${CONTROL_FOCUS_VISIBLE}`;

const SIZES = {
  sm: "px-3.5 py-2 text-[13px]",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
} as const;

const VARIANTS = {
  primary: "bg-adm-primary text-adm-on-primary hover:bg-adm-primary-deep active:bg-adm-primary-deep",
  secondary:
    "border border-adm-border bg-adm-surface-card text-adm-text hover:border-adm-text-tertiary hover:bg-adm-surface-secondary active:bg-adm-surface-secondary",
  ghost: "text-adm-text-secondary hover:bg-adm-surface-secondary",
  danger: "bg-adm-danger text-white hover:brightness-95 active:brightness-90",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AdminButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function AdminButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
