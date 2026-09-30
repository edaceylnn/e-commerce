// Invoice arithmetic, in whole kuruş (integers) — floating-point lira
// amounts drift by a kuruş here and there, and an invoice can't.
//
// Prices are VAT-inclusive (shown "KDV dahil"), so each line's gross amount
// is fixed first and its net and VAT are derived from it:
//   net = round(gross / (1 + rate)),  vat = gross − net
// That way an invoice always adds up to exactly what the customer paid.
// Pure — no DB access.

export type Kurus = number;

export function toKurus(lira: number | string | { toString(): string }): Kurus {
  return Math.round(Number(lira.toString()) * 100);
}

export function toLira(kurus: Kurus): number {
  return kurus / 100;
}

// Splits `total` across `weights` proportionally, in whole units, so the
// parts always sum to `total` exactly: everyone gets the floor of their
// share, then the leftover units go to the largest remainders (ties to the
// earlier line).
export function allocate(total: Kurus, weights: number[]): Kurus[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] += 1;
    left -= 1;
  }
  return parts;
}

export type DiscountLine = { gross: Kurus; campaignEligible: boolean };

// Where an order's discount lands. A coupon applies to the whole basket; a
// campaign only to the lines it covers (category/brand). Each line's share
// is proportional to its amount and never exceeds it.
export function allocateDiscount(
  lines: DiscountLine[],
  discount: Kurus,
  kind: "coupon" | "campaign" | null
): Kurus[] {
  if (!kind || discount <= 0) return lines.map(() => 0);
  const weights = lines.map((l) => (kind === "campaign" && !l.campaignEligible ? 0 : l.gross));
  const capped = Math.min(discount, weights.reduce((a, b) => a + b, 0));
  return allocate(capped, weights);
}

// Net and VAT inside a VAT-inclusive amount. `rate` is a percentage (20,
// 10, 1…); basis points keep fractional rates exact.
export function splitVat(gross: Kurus, rate: number): { net: Kurus; vat: Kurus } {
  const bp = Math.round(rate * 100);
  const net = Math.round((gross * 10_000) / (10_000 + bp));
  return { net, vat: gross - net };
}

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: Kurus; // VAT-inclusive, before the order discount
  discount: Kurus; // this line's share of the order discount
  vatRate: number;
};

export type ComputedLine = InvoiceLineInput & { gross: Kurus; net: Kurus; vat: Kurus };

export type ComputedInvoice = {
  lines: ComputedLine[];
  // Per VAT rate, as printed under the lines ("%20 matrah / KDV").
  byRate: { rate: number; net: Kurus; vat: Kurus }[];
  net: Kurus;
  vat: Kurus;
  gross: Kurus;
};

export function computeInvoice(inputs: InvoiceLineInput[]): ComputedInvoice {
  const lines = inputs.map((l) => {
    const gross = l.unitPrice * l.quantity - l.discount;
    return { ...l, gross, ...splitVat(gross, l.vatRate) };
  });
  const rates = [...new Set(lines.map((l) => l.vatRate))].sort((a, b) => b - a);
  const byRate = rates.map((rate) => {
    const of = lines.filter((l) => l.vatRate === rate);
    return {
      rate,
      net: of.reduce((s, l) => s + l.net, 0),
      vat: of.reduce((s, l) => s + l.vat, 0),
    };
  });
  return {
    lines,
    byRate,
    net: lines.reduce((s, l) => s + l.net, 0),
    vat: lines.reduce((s, l) => s + l.vat, 0),
    gross: lines.reduce((s, l) => s + l.gross, 0),
  };
}
