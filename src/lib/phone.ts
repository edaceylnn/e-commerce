// Formats digits as a Turkish mobile number while typing: "0555 555 55 55".
// Purely cosmetic — the API still validates/stores whatever string arrives.
export function formatTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 9));
  if (digits.length > 9) parts.push(digits.slice(9, 11));
  return parts.join(" ");
}
