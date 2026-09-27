// Pure formatting helpers with no server-only dependencies, so both Server
// and Client Components (e.g. the cart page) can import them safely.

const numberFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 0,
});

// Prices are stored in TRY (see prisma/seed.ts for the import-time note on
// why DummyJSON's USD figures are treated as TRY rather than converted).
// "₺1.290" — no kuruş, matching the reference admin design's price
// treatment; applied sitewide (not just admin) for one consistent format.
export function formatPrice(amount: number): string {
  return `₺${numberFormatter.format(Math.round(amount))}`;
}

// Two-letter avatar initials for admin tables/cards — first+last name
// initial, or the first two letters of a single name/email as a fallback.
export function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

const dayMonthFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
});

// Estimated delivery window, `minDays`–`maxDays` after `from`. formatRange
// only repeats what differs between the two dates, so a window that crosses
// a month keeps both months ("29 Eylül – 1 Ekim"), one inside a month shows
// it once ("5 – 8 Ekim"), and one crossing a year adds the years.
export function formatDeliveryWindow(from: Date, minDays: number, maxDays: number): string {
  const start = new Date(from);
  start.setDate(start.getDate() + minDays);
  const end = new Date(from);
  end.setDate(end.getDate() + maxDays);
  return dayMonthFormatter.formatRange(start, end);
}
