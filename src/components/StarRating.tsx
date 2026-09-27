"use client";

// Doubles as a read-only display (ProductCard, product detail) and a
// clickable input (ReviewSection's rating field) via the optional
// `onChange` prop, rather than forking a second component.
export function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange?: (value: number) => void;
}) {
  const rounded = Math.round(rating);
  const interactive = !!onChange;

  return (
    <div
      className="flex items-center gap-0.5 text-primary"
      aria-label={interactive ? undefined : `${rating.toFixed(1)} / 5`}
      role={interactive ? "radiogroup" : undefined}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const value = i + 1;
        const filled = value <= rounded;

        if (!interactive) {
          return (
            <span key={i} className={filled ? "opacity-100" : "opacity-25"}>
              ★
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(value)}
            aria-label={`${value} yıldız`}
            aria-pressed={value === rounded}
            className={`text-lg leading-none transition hover:opacity-100 ${
              filled ? "opacity-100" : "opacity-25"
            }`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
