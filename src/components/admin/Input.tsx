import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import {
  CONTROL_BORDER_TONE,
  CONTROL_FOCUS_WITHIN,
  CONTROL_SHELL,
  CONTROL_SIZE_CLASS,
  type ControlSize,
} from "@/components/admin/controlStyles";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
  size?: ControlSize;
  label?: string;
  optional?: boolean;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerClassName?: string;
};

// The one text-input shell for the admin panel — a light card surface, a
// hairline border, and a quiet focus-within treatment (border shift + a
// faint ring, never a bright accent color). label/helperText/error and
// leftIcon/rightIcon/prefix/suffix are all optional so this same component
// covers a bare filter-bar search box and a fully labeled form field.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    label,
    optional,
    helperText,
    error,
    leftIcon,
    rightIcon,
    prefix,
    suffix,
    className = "",
    containerClassName = "",
    id,
    disabled,
    readOnly,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-adm-text-secondary">
          {label}
          {optional && <span className="font-normal text-adm-text-tertiary">(opsiyonel)</span>}
        </label>
      )}
      <div
        className={`flex items-center gap-2 ${CONTROL_SHELL} ${CONTROL_SIZE_CLASS[size]} ${
          error ? CONTROL_BORDER_TONE.error : CONTROL_BORDER_TONE.default
        } ${disabled ? "bg-adm-surface-secondary opacity-60" : ""} ${
          readOnly ? "bg-adm-surface-secondary" : ""
        } ${!disabled ? CONTROL_FOCUS_WITHIN : ""} transition`}
      >
        {leftIcon && (
          <span className="flex shrink-0 items-center text-adm-text-tertiary [&_svg]:h-4 [&_svg]:w-4">
            {leftIcon}
          </span>
        )}
        {prefix && <span className="shrink-0 text-adm-text-tertiary">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={`w-full min-w-0 bg-transparent text-adm-text outline-none placeholder:text-adm-text-tertiary disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {suffix && <span className="shrink-0 text-adm-text-tertiary">{suffix}</span>}
        {rightIcon && (
          <span className="flex shrink-0 items-center text-adm-text-tertiary [&_svg]:h-4 [&_svg]:w-4">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-adm-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-adm-text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
