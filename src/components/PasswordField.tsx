"use client";

import { useId, useState } from "react";
import { FormField, fieldInputClass, type FieldSurface } from "@/components/FormField";
import { EyeIcon, EyeOffIcon } from "@/components/icons/AccountIcons";

export function PasswordField({
  label,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  hint,
  error,
  surface,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
  error?: string | null;
  surface?: FieldSurface;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} htmlFor={id} required={required} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldInputClass(!!error, surface)} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          // 36px hit area around an 18px icon, so it's comfortably tappable.
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-ink-soft transition hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </FormField>
  );
}
