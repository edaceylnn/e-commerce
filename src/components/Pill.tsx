import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// The storefront's three button styles (see /design-system). Every variant
// shares the label typography and the same state treatment: a visible
// keyboard focus ring, a 1px press, and a dimmed, inert disabled state.
const base =
  "inline-flex items-center justify-center gap-2 font-sans text-xs font-semibold uppercase tracking-label transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants = {
  solid: "px-7 py-4 bg-primary text-background hover:bg-primary-dark hover:text-accent-ink",
  outline: "px-7 py-4 border border-line text-ink hover:border-ink",
  ghost: "border-b border-current pb-1 text-ink hover:text-accent",
} as const;

export type PillVariant = keyof typeof variants;

export function pillClassName(variant: PillVariant = "solid", className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
}

type PillProps = {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
};

export function PillLink({
  href,
  children,
  variant = "solid",
  className = "",
}: PillProps & { href: string }) {
  return (
    <Link href={href} className={pillClassName(variant, className)}>
      {children}
    </Link>
  );
}

export function PillButton({
  children,
  variant = "solid",
  className = "",
  ...props
}: PillProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={pillClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}
