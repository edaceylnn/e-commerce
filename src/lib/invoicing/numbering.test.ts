import { formatInvoiceNumber, invoiceYear } from "@/lib/invoicing/numbering";

describe("invoice numbering", () => {
  it("pads to the 16-character e-Arşiv shape", () => {
    expect(formatInvoiceNumber("EDA", 2026, 1)).toBe("EDA2026000000001");
    expect(formatInvoiceNumber("EDA", 2026, 123456789)).toBe("EDA2026123456789");
  });

  it("takes the year from Turkish time, not UTC", () => {
    // 31 Dec 2026 22:30 UTC is already 1 Jan 2027 01:30 in İstanbul.
    expect(invoiceYear(new Date("2026-12-31T22:30:00Z"))).toBe(2027);
    expect(invoiceYear(new Date("2026-12-31T20:59:00Z"))).toBe(2026);
  });
});
