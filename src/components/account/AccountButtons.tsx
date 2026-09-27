import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, AnchorHTMLAttributes } from "react";
import { PillButton, PillLink } from "@/components/Pill";

// Thin, explicitly-named wrappers over Pill's existing solid/outline
// variants — not a second button system. "Primary" = brand-filled action,
// "Secondary" = outlined, "Text" = the underlined text-link pattern already
// used throughout the account area, finally given one shared definition.
// size="sm" is the compact form used inside cards/rows; omit it for the
// full-size call-to-action buttons Pill already renders by default.

type Size = "sm" | "md";
const SIZE_CLASS: Record<Size, string> = {
  sm: "!px-5 !py-2 !text-xs",
  md: "",
};

type CommonProps = {
  children: ReactNode;
  className?: string;
  size?: Size;
};

export function PrimaryButton({
  children,
  className = "",
  size = "md",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <PillButton variant="solid" className={`${SIZE_CLASS[size]} ${className}`} {...props}>
      {children}
    </PillButton>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
  size = "md",
}: CommonProps & { href: string }) {
  return (
    <PillLink href={href} variant="solid" className={`${SIZE_CLASS[size]} ${className}`}>
      {children}
    </PillLink>
  );
}

export function SecondaryButton({
  children,
  className = "",
  size = "md",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <PillButton variant="outline" className={`${SIZE_CLASS[size]} ${className}`} {...props}>
      {children}
    </PillButton>
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
  size = "md",
}: CommonProps & { href: string }) {
  return (
    <PillLink href={href} variant="outline" className={`${SIZE_CLASS[size]} ${className}`}>
      {children}
    </PillLink>
  );
}

const TEXT_BUTTON_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-primary underline underline-offset-4 transition hover:text-primary-dark disabled:opacity-50 disabled:no-underline";

export function TextButton({
  children,
  className = "",
  ...props
}: { children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${TEXT_BUTTON_CLASS} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function TextLink({
  href,
  children,
  className = "",
  ...props
}: { href: string; children: ReactNode; className?: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link href={href} className={`${TEXT_BUTTON_CLASS} ${className}`} {...props}>
      {children}
    </Link>
  );
}
