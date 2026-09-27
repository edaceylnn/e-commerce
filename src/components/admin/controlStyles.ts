// Single source of truth for the vertical rhythm shared by every admin
// form control — Button, Input, SearchInput, Select, FilterSelect. Changing
// a size here changes it everywhere at once, and it's why a button dropped
// next to an input never looks like it wandered in from a different system.
export type ControlSize = "sm" | "md" | "lg";

// py + text-size only — every control shares these two axes regardless of
// its own left/right padding needs (a select needs extra right padding for
// its chevron, an input doesn't), so this never gets stacked with a
// conflicting px-* utility.
export const CONTROL_SIZE_CLASS: Record<ControlSize, string> = {
  sm: "py-2 px-3 text-[13px]",
  md: "py-2.5 px-3.5 text-sm",
  lg: "py-3 px-4 text-sm",
};

// Select/FilterSelect: symmetric px replaced with an asymmetric pl/pr that
// leaves room for the trailing chevron — never combine this with
// CONTROL_SIZE_CLASS on the same element (both set left/right padding).
export const CONTROL_SIZE_CLASS_SELECT: Record<ControlSize, string> = {
  sm: "py-2 pl-3 pr-8 text-[13px]",
  md: "py-2.5 pl-3.5 pr-9 text-sm",
  lg: "py-3 pl-4 pr-10 text-sm",
};

export const CONTROL_CHEVRON_CLASS: Record<ControlSize, string> = {
  sm: "right-2.5 h-3 w-3",
  md: "right-3 h-3.5 w-3.5",
  lg: "right-3.5 h-4 w-4",
};

// Radius/border/surface shared by every control's outer shell.
export const CONTROL_SHELL = "rounded-xl border bg-adm-surface-card";

// Neutral, low-contrast focus treatment — a border shift plus a faint ring,
// never a bright/saturated color. Applied with `focus-within:` on a wrapper
// div (Input) or `focus-visible:` directly on the control (Select, Button).
export const CONTROL_FOCUS_WITHIN =
  "focus-within:border-adm-text-tertiary focus-within:ring-2 focus-within:ring-adm-primary/15";
export const CONTROL_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:border-adm-text-tertiary focus-visible:ring-2 focus-visible:ring-adm-primary/15";

export const CONTROL_BORDER_TONE = {
  default: "border-adm-border hover:border-adm-text-tertiary",
  error: "border-adm-danger",
} as const;
