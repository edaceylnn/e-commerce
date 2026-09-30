// E-invoice providers (e-Arşiv). There is no provider contract yet, so a
// simulator stands in: it accepts every invoice and returns a reference,
// the way a real one (Paraşüt, Logo, Uyumsoft…) would after forwarding it
// to GİB. A real provider slots in behind the same two calls.

export type ProviderInvoice = {
  number: string;
  type: "SALE" | "RETURN";
  grandTotal: number;
};

export type InvoiceProvider = {
  code: string;
  issue(invoice: ProviderInvoice): Promise<{ providerRef: string }>;
  cancel(providerRef: string): Promise<void>;
};

const simulator: InvoiceProvider = {
  code: "simulator",
  async issue(invoice) {
    return { providerRef: `SIM-${invoice.number}` };
  },
  async cancel() {},
};

export function invoiceProvider(): InvoiceProvider {
  return simulator;
}
