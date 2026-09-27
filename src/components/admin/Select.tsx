import { forwardRef, useId } from "react";
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

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: ControlSize;
  label?: string;
  optional?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  options?: SelectOption[];
  containerClassName?: string;
};

// The full, form-context select — same shell/chevron as FilterSelect (they
// share every class from controlStyles.ts) plus label/helperText/error, for
// places a plain filter chip isn't enough (product forms, settings, …).
// Pass either `options` or hand-written <option> children.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    size = "md",
    label,
    optional,
    helperText,
    error,
    placeholder,
    options,
    className = "",
    containerClassName = "",
    id,
    disabled,
    children,
    ...props
  },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-adm-text-secondary">
          {label}
          {optional && <span className="font-normal text-adm-text-tertiary">(opsiyonel)</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={`peer w-full cursor-pointer appearance-none font-semibold text-adm-text outline-none transition disabled:cursor-not-allowed disabled:bg-adm-surface-secondary disabled:opacity-60 ${CONTROL_SHELL} ${
            CONTROL_SIZE_CLASS_SELECT[size]
          } ${error ? CONTROL_BORDER_TONE.error : CONTROL_BORDER_TONE.default} ${CONTROL_FOCUS_VISIBLE} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled={props.required}>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDownIcon
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-adm-text-tertiary transition peer-hover:text-adm-text-secondary ${CONTROL_CHEVRON_CLASS[size]}`}
        />
      </div>
      {error ? (
        <p id={`${selectId}-error`} className="mt-1 text-xs text-adm-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="mt-1 text-xs text-adm-text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
