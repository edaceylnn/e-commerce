import { forwardRef } from "react";
import { Input, type InputProps } from "@/components/admin/Input";
import { CloseIcon } from "@/components/icons/AdminIcons";

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// Input pre-wired with a muted search glyph and, once there's something
// typed, a small clear button — same shell/size/focus system as Input, so
// a search box and a plain text field never look like two components.
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon" | "type">>(
  function SearchInput({ rightIcon, value, onChange, ...props }, ref) {
    const showClear = Boolean(value) && !props.disabled && !props.readOnly;
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<SearchGlyph />}
        rightIcon={
          showClear ? (
            <button
              type="button"
              aria-label="Aramayı temizle"
              className="pointer-events-auto rounded-full p-0.5 text-adm-text-tertiary transition hover:bg-adm-surface-secondary hover:text-adm-text-secondary"
              onClick={() => {
                onChange?.({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
              }}
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            rightIcon
          )
        }
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  }
);
