import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/icons/AdminLuxeIcons";
import {
  CONTROL_BORDER_TONE,
  CONTROL_CHEVRON_CLASS,
  CONTROL_FOCUS_VISIBLE,
  CONTROL_SHELL,
  CONTROL_SIZE_CLASS_SELECT,
  type ControlSize,
} from "@/components/admin/controlStyles";

// The lean, label-less version of Select for filter bars (Kategori, Marka,
// Stok, ödeme durumu, tarih aralığı, …) — same shell/size/chevron/focus
// classes as Select and Input (all three read from controlStyles.ts), just
// without the label/helper/error wrapper a filter chip never needs.
// `uiSize` (not `size`) because native <select> already has a `size`
// attribute (visible row count) that would otherwise collide with it.
export function FilterSelect({
  className = "",
  uiSize = "md",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { uiSize?: ControlSize }) {
  return (
    <div className="relative inline-flex">
      <select
        className={`peer w-full cursor-pointer appearance-none font-semibold text-adm-text outline-none transition disabled:pointer-events-none disabled:opacity-50 ${CONTROL_SHELL} ${
          CONTROL_SIZE_CLASS_SELECT[uiSize]
        } ${CONTROL_BORDER_TONE.default} ${CONTROL_FOCUS_VISIBLE} ${className}`}
        {...props}
      />
      <ChevronDownIcon
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-adm-text-tertiary transition peer-hover:text-adm-text-secondary ${CONTROL_CHEVRON_CLASS[uiSize]}`}
      />
    </div>
  );
}
