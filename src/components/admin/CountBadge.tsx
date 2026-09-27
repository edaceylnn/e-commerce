import { ReactNode } from "react";

// A number riding next to a label ("Tümü 248", "Aktif 214") — deliberately
// quieter than StatusBadge: neutral gray only, no semantic color, so it
// never competes with the status badges it often sits beside in the same
// row. `inverse` is for a count sitting on a filled/dark surface (the
// active tab's own bg) where the neutral-gray-on-white treatment would
// disappear or clash — it swaps to a translucent tint of whatever text
// color is already in scope instead of a fixed color.
export function CountBadge({
  children,
  size = "sm",
  inverse = false,
  className = "",
}: {
  children: ReactNode;
  size?: "sm" | "md";
  inverse?: boolean;
  className?: string;
}) {
  const sizeClass = size === "sm" ? "px-1.5 py-px text-[10.5px]" : "px-2 py-0.5 text-[11px]";
  const tone = inverse ? "bg-white/20 text-current" : "bg-adm-surface-secondary text-adm-text-tertiary";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold leading-none ${sizeClass} ${tone} ${className}`}
    >
      {children}
    </span>
  );
}
