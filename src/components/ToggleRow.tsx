import { Switch } from "@/components/Switch";

// One row of a preferences list — wrap a set of these in a
// `<ul className="divide-y divide-line">` for consistent height/separators
// (see NotificationPreferencesForm).
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="pr-4">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}
