import { allocate, allocateDiscount, computeInvoice, splitVat, toKurus } from "./tax";

// Small deterministic PRNG so the randomized checks are reproducible.
function rng(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
    return seed / 2 ** 31;
  };
}

describe("toKurus", () => {
  it("avoids floating-point drift", () => {
    expect(toKurus(0.1 + 0.2)).toBe(30);
    expect(toKurus("1290.00")).toBe(129000);
    expect(toKurus(29.9)).toBe(2990);
  });
});

describe("allocate", () => {
  it("always sums to the total", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
    expect(allocate(7, [0, 0])).toEqual([0, 0]);
  });

  it("stays exact on random inputs", () => {
    const r = rng(1);
    for (let n = 0; n < 500; n++) {
      const weights = Array.from({ length: 1 + Math.floor(r() * 6) }, () => Math.floor(r() * 500_000));
      const total = Math.floor(r() * 100_000);
      const parts = allocate(total, weights);
      if (weights.some((w) => w > 0)) expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      parts.forEach((p, i) => weights[i] === 0 && expect(p).toBe(0));
    }
  });
});

describe("allocateDiscount", () => {
  const lines = [
    { gross: 129000, campaignEligible: true },
    { gross: 69000, campaignEligible: false },
  ];

  it("spreads a coupon over every line", () => {
    expect(allocateDiscount(lines, 19800, "coupon")).toEqual([12900, 6900]);
  });

  it("keeps a campaign on the lines it covers", () => {
    expect(allocateDiscount(lines, 12900, "campaign")).toEqual([12900, 0]);
  });

  it("never discounts more than the lines are worth", () => {
    expect(allocateDiscount(lines, 999999, "coupon")).toEqual([129000, 69000]);
  });
});

describe("splitVat", () => {
  it("backs net and VAT out of a VAT-inclusive amount", () => {
    expect(splitVat(129000, 20)).toEqual({ net: 107500, vat: 21500 });
    expect(splitVat(2990, 20)).toEqual({ net: 2492, vat: 498 });
    expect(splitVat(1000, 10)).toEqual({ net: 909, vat: 91 });
    expect(splitVat(1000, 0)).toEqual({ net: 1000, vat: 0 });
  });
});

describe("computeInvoice", () => {
  it("matches the design example to the kuruş", () => {
    const inv = computeInvoice([
      { description: "Tayt", quantity: 1, unitPrice: 129000, discount: 12900, vatRate: 20 },
      { description: "Sütyen", quantity: 1, unitPrice: 69000, discount: 6900, vatRate: 20 },
      { description: "Kargo", quantity: 1, unitPrice: 2990, discount: 0, vatRate: 20 },
    ]);
    expect(inv.lines.map((l) => [l.gross, l.net, l.vat])).toEqual([
      [116100, 96750, 19350],
      [62100, 51750, 10350],
      [2990, 2492, 498],
    ]);
    expect(inv).toMatchObject({ gross: 181190, net: 150992, vat: 30198 });
    expect(inv.byRate).toEqual([{ rate: 20, net: 150992, vat: 30198 }]);
  });

  it("always totals exactly what was paid (randomized baskets)", () => {
    const r = rng(42);
    const rates = [20, 10, 1];
    for (let n = 0; n < 1000; n++) {
      const items = Array.from({ length: 1 + Math.floor(r() * 5) }, () => ({
        unit: 100 + Math.floor(r() * 400_000),
        qty: 1 + Math.floor(r() * 3),
        rate: rates[Math.floor(r() * rates.length)],
        eligible: r() > 0.5,
      }));
      const subtotal = items.reduce((s, i) => s + i.unit * i.qty, 0);
      const kind = r() > 0.5 ? "coupon" : "campaign";
      const discount = Math.floor(r() * subtotal * 0.3);
      const shares = allocateDiscount(
        items.map((i) => ({ gross: i.unit * i.qty, campaignEligible: i.eligible })),
        discount,
        kind
      );
      const applied = shares.reduce((a, b) => a + b, 0);
      const inv = computeInvoice(
        items.map((i, k) => ({ description: "x", quantity: i.qty, unitPrice: i.unit, discount: shares[k], vatRate: i.rate }))
      );
      expect(inv.gross).toBe(subtotal - applied);
      expect(inv.net + inv.vat).toBe(inv.gross);
      expect(inv.byRate.reduce((s, b) => s + b.net + b.vat, 0)).toBe(inv.gross);
      inv.lines.forEach((l) => expect(l.net).toBeGreaterThanOrEqual(0));
    }
  });
});
