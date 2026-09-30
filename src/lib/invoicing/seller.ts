// The seller as printed on invoices. Placeholder values — a real store puts
// its registered details here (or in Ayarlar) before issuing real invoices.
export const SELLER = {
  name: "EDACEY Tekstil (örnek)",
  address: "Örnek Mah. Örnek Cad. No:1, Kadıköy / İstanbul",
  phone: "0216 000 00 00",
  email: "fatura@edacey.example",
  website: "www.edacey.example",
  taxOffice: "Kadıköy (örnek)",
  taxNumber: "0000000000",
  mersisNo: "0000000000000000",
  tradeRegistryNo: "000000",
};

// e-Arşiv invoice series: 3 letters, then the year and a 9-digit sequence.
// Overridable so tests number their own series ("TST") and never leave
// gaps in the real one — numbers must stay gapless.
export function invoiceSeries() {
  const series = process.env.INVOICE_SERIES ?? "EDA";
  if (!/^[A-Z]{3}$/.test(series)) throw new Error(`INVOICE_SERIES must be 3 capital letters, got "${series}"`);
  return series;
}

// Individual buyers' T.C. kimlik no isn't collected at checkout; e-Arşiv
// accepts this placeholder for consumers who don't give one.
export const ANONYMOUS_BUYER_ID = "11111111111";
