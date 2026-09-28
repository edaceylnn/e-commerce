import type { ReactNode } from "react";

const PADDING = {
  sm: "pt-5",
  md: "pt-6",
  lg: "pt-8",
} as const;

// The one card shell every account screen builds on — an outlined region on
// the page's own cream background (no white fill), 1px line border, no
// radius/shadow. Matches every other bordered box in the storefront (address
// confirmations, product accordions, ...); white/--ivory is reserved for the
// few panels EDACEY deliberately calls out as a distinct surface, like the
// cart/checkout order summary. Keeps every account section (Genel Bakış,
// Siparişlerim, Adreslerim, ...) visually identical.
export function AccountCard({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof PADDING;
}) {
  return (
    <div className={`border-t border-line ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
