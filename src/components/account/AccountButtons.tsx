import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PillButton, PillLink } from "@/components/Pill";

// Thin, explicitly-named wrappers over Pill's existing solid/outline
// variants — not a second button system. "Primary" = brand-filled action,
// "Secondary" = outlined, "Text" = the underlined text-link pattern already
// used throughout the account area, finally given one shared definition.
// size="sm" is the compact form used inside cards/rows; omit it for the
// full-size call-to-action buttons Pill already renders by default.

type Size = "sm" | "md";
const SIZE_CLASS: Record<Size, string> = {
  sm: "!h-10 !px-6",
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

const TEXT_BUTTON_CLASS =
  "text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 transition-colors hover:text-ink disabled:opacity-50 disabled:no-underline";

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
