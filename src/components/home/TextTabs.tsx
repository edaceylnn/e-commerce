"use client";

// Plain-text tab row (design handoff: "Best Sellers" filters, newsletter
// preference): 11.5px uppercase, the active one in ink with a 1px underline.
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-6 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`border-b pb-1 text-nav uppercase tracking-label transition-colors duration-200 ${
              active ? "border-ink text-ink" : "border-transparent text-text-4 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
