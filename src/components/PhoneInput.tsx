import { formatTrPhone } from "@/lib/phone";
import { fieldInputClass } from "@/components/FormField";

export function PhoneInput({
  id,
  value,
  onChange,
  required,
  hasError,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hasError?: boolean;
}) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      placeholder="05XX XXX XX XX"
      required={required}
      value={value}
      onChange={(e) => onChange(formatTrPhone(e.target.value))}
      className={fieldInputClass(hasError)}
    />
  );
}
