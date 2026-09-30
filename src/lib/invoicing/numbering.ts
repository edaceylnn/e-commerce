import type { Prisma } from "@/generated/prisma/client";
import { invoiceSeries } from "@/lib/invoicing/seller";

// The invoice year is the Turkish calendar year: at 00:30 on 1 January in
// İstanbul it's still 31 December in UTC.
export function invoiceYear(at: Date) {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric" }).format(at));
}

export function formatInvoiceNumber(series: string, year: number, sequence: number) {
  return `${series}${year}${String(sequence).padStart(9, "0")}`;
}

// Next number in the series. The upsert takes the sequence row's lock, so
// concurrent invoices get distinct numbers; and since it's part of the
// invoice's own transaction, a failed invoice rolls its number back —
// numbers stay gapless.
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, at: Date) {
  const year = invoiceYear(at);
  const prefix = invoiceSeries();
  const series = `${prefix}${year}`;
  const [row] = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "InvoiceSequence" ("series", "lastNumber") VALUES (${series}, 1)
    ON CONFLICT ("series") DO UPDATE SET "lastNumber" = "InvoiceSequence"."lastNumber" + 1
    RETURNING "lastNumber"`;
  return formatInvoiceNumber(prefix, year, row.lastNumber);
}
