import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// The storefront's three button styles. Every variant
// shares the label typography and the same state treatment: a visible
// keyboard focus ring, a 1px press, and a dimmed, inert disabled state.
// Design handoff → Buttons: square corners, 11.5px uppercase. Primary is a
// 52px ink block, secondary a 48px 1px-ink outline that inverts on hover,
// ghost the underlined text CTA.
const base =
  "inline-flex items-center justify-center gap-2 font-sans text-nav uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants = {
  solid: "h-[52px] px-10 tracking-[0.16em] bg-ink text-background hover:bg-ink-hover",
  outline: "h-12 px-11 tracking-cta border border-ink text-ink hover:bg-ink hover:text-background",
  ghost: "border-b border-current pb-[5px] tracking-cta text-ink",
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
