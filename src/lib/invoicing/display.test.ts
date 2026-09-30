import { amountInWords, displayLine, numberToWords } from "@/lib/invoicing/display";
import { splitVat } from "@/lib/invoicing/tax";

describe("invoice display", () => {
  it("shows VAT-exclusive price and discount that add up to the stored net", () => {
    // Tayt 1290 with a 129 coupon share, 20% VAT: net 967,50.
    expect(displayLine({ quantity: 1, unitPrice: 129000, discount: 12900, vatRate: 20, net: 96750 })).toEqual({
      unitNet: 107500,
      amount: 107500,
      discount: 10750,
    });
    for (let i = 0; i < 1000; i++) {
      const quantity = 1 + Math.floor(Math.random() * 5);
      const unitPrice = 1 + Math.floor(Math.random() * 500000);
      const vatRate = [0, 1, 10, 20][i % 4];
      const discount = Math.floor(Math.random() * unitPrice * quantity * 0.5);
      const { net } = splitVat(unitPrice * quantity - discount, vatRate);
      const shown = displayLine({ quantity, unitPrice, discount, vatRate, net });
      expect(shown.amount - shown.discount).toBe(net);
      expect(shown.discount).toBeGreaterThanOrEqual(0);
      if (discount === 0) expect(shown.discount).toBe(0);
    }
  });

  it("writes amounts in Turkish words", () => {
    expect(numberToWords(0)).toBe("sıfır");
    expect(numberToWords(1000)).toBe("bin");
    expect(numberToWords(1100)).toBe("bin yüz");
    expect(numberToWords(2390)).toBe("iki bin üç yüz doksan");
    expect(numberToWords(1_001_001)).toBe("bir milyon bin bir");
    expect(numberToWords(21_000)).toBe("yirmi bir bin");
    expect(amountInWords(181190)).toBe("Bin sekiz yüz on bir Türk lirası doksan kuruş");
    expect(amountInWords(239000)).toBe("İki bin üç yüz doksan Türk lirası");
  });
});
