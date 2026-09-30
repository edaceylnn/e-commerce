import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { nextInvoiceNumber } from "@/lib/invoicing/numbering";
import { invoiceProvider } from "@/lib/invoicing/provider";
import { ANONYMOUS_BUYER_ID } from "@/lib/invoicing/seller";
import { computeInvoice, toKurus, toLira, type InvoiceLineInput } from "@/lib/invoicing/tax";

// Issuing, cancelling and returning invoices. Everything is computed from
// the order's checkout snapshot (unit price, VAT rate and discount share
// per line, frozen when the order was placed) — never from today's product
// data. An issued invoice is immutable in the database itself.

export class InvoiceError extends Error {}

const SHIPPABLE_OR_LATER = ["HAZIRLANIYOR", "KARGOLANDI", "TESLIM_EDILDI"];

type Line = InvoiceLineInput & { orderItemId: string | null };

const orderForInvoice = {
  items: true,
  user: { select: { email: true } },
  billingAddress: true,
  invoices: { include: { lines: { select: { orderItemId: true } } } },
} as const;

async function loadOrder(tx: Prisma.TransactionClient, orderId: string) {
  // Serialises invoicing per order: two "issue" calls can't both see "no
  // invoice yet" and issue twice.
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return tx.order.findUnique({ where: { id: orderId }, include: orderForInvoice });
}
type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function itemLines(order: LoadedOrder, items = order.items): Line[] {
  return items.map((item) => ({
    orderItemId: item.id,
    description: item.sku ? `${item.title} (${item.sku})` : item.title,
    quantity: item.quantity,
    unitPrice: toKurus(item.unitPrice),
    discount: toKurus(item.discountAmount),
    vatRate: Number(item.taxRate),
  }));
}

function shippingLine(order: LoadedOrder): Line[] {
  const cost = toKurus(order.shippingCost);
  if (cost <= 0) return [];
  return [
    {
      orderItemId: null,
      description: "Kargo bedeli",
      quantity: 1,
      unitPrice: cost,
      discount: 0,
      vatRate: Number(order.shippingTaxRate),
    },
  ];
}

async function createInvoice(
  tx: Prisma.TransactionClient,
  order: LoadedOrder,
  type: "SALE" | "RETURN",
  lines: Line[],
  originalInvoiceId: string | null,
  actorUserId?: string,
  issuedAt = new Date()
) {
  const computed = computeInvoice(lines);
  const number = await nextInvoiceNumber(tx, issuedAt);
  const provider = invoiceProvider();
  const { providerRef } = await provider.issue({ number, type, grandTotal: toLira(computed.gross) });
  const address = order.billingAddress;

  const invoice = await tx.invoice.create({
    data: {
      orderId: order.id,
      type,
      number,
      issuedAt,
      buyerName: address.fullName,
      buyerIdentity: ANONYMOUS_BUYER_ID,
      buyerAddress: `${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.district} / ${address.city}`,
      buyerEmail: order.user.email,
      netTotal: toLira(computed.net),
      vatTotal: toLira(computed.vat),
      grandTotal: toLira(computed.gross),
      provider: provider.code,
      providerRef,
      originalInvoiceId,
      lines: {
        create: computed.lines.map((l, position) => ({
          orderItemId: lines[position].orderItemId,
          position,
          description: l.description,
          quantity: l.quantity,
          vatRate: l.vatRate,
          unitPrice: toLira(l.unitPrice),
          discount: toLira(l.discount),
          gross: toLira(l.gross),
          net: toLira(l.net),
          vat: toLira(l.vat),
        })),
      },
    },
  });
  await tx.orderEvent.create({
    data: {
      orderId: order.id,
      type: "NOTE",
      createdAt: issuedAt,
      message: `${type === "SALE" ? "Fatura" : "İade faturası"} kesildi: ${number} (${toLira(computed.gross).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}).`,
      actorUserId,
    },
  });
  return invoice;
}

// The order's sale invoice — issued once; asking again returns it.
// `issuedAt` is only ever set by the demo data script (backdated orders).
export async function issueSaleInvoice(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorUserId?: string,
  issuedAt?: Date
) {
  const order = await loadOrder(tx, orderId);
  if (!order) throw new InvoiceError("Sipariş bulunamadı.");
  const existing = order.invoices.find((i) => i.type === "SALE" && i.status === "ISSUED");
  if (existing) return { invoice: existing, created: false };
  if (!order.paidAt || !SHIPPABLE_OR_LATER.includes(order.status)) {
    throw new InvoiceError("Yalnızca ödenmiş ve iptal edilmemiş siparişe fatura kesilebilir.");
  }

  const lines = [...itemLines(order), ...shippingLine(order)];
  // An invoice must add up to exactly what was charged; if the snapshot
  // doesn't, refuse rather than issue a wrong legal document.
  const gross = computeInvoice(lines).gross;
  if (gross !== toKurus(order.total)) {
    throw new InvoiceError(
      `Fatura tutarı (${toLira(gross)}) sipariş tutarıyla (${Number(order.total)}) uyuşmuyor; fatura kesilmedi.`
    );
  }
  return { invoice: await createInvoice(tx, order, "SALE", lines, null, actorUserId, issuedAt), created: true };
}

// A return document for refunded lines (and the shipping fee when the whole
// order is refunded). Lines already on an earlier return are skipped.
export async function issueReturnInvoice(
  tx: Prisma.TransactionClient,
  orderId: string,
  { orderItemIds, includeShipping }: { orderItemIds: string[] | "all"; includeShipping: boolean },
  actorUserId?: string
) {
  const order = await loadOrder(tx, orderId);
  if (!order) throw new InvoiceError("Sipariş bulunamadı.");
  const sale = order.invoices.find((i) => i.type === "SALE" && i.status === "ISSUED");
  if (!sale) return null; // nothing was invoiced, so there's nothing to reverse

  const activeReturns = order.invoices.filter((i) => i.type === "RETURN" && i.status === "ISSUED");
  const returned = new Set(activeReturns.flatMap((i) => i.lines.map((l) => l.orderItemId)));
  const items = order.items.filter(
    (item) => (orderItemIds === "all" || orderItemIds.includes(item.id)) && !returned.has(item.id)
  );
  const shippingReturned = returned.has(null);
  const lines = [...itemLines(order, items), ...(includeShipping && !shippingReturned ? shippingLine(order) : [])];
  if (lines.length === 0) return null;
  return createInvoice(tx, order, "RETURN", lines, sale.id, actorUserId);
}

// Cancels a sale invoice issued by mistake (or for an order cancelled
// before shipping). Not once returns were issued against it.
export async function cancelInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  reason: string,
  actorUserId?: string
) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { returns: true } });
  if (!invoice) throw new InvoiceError("Fatura bulunamadı.");
  if (invoice.status === "CANCELLED") return invoice;
  if (invoice.returns.some((r) => r.status === "ISSUED")) {
    throw new InvoiceError("Bu faturaya kesilmiş iade faturası var; önce iade iptal edilmeli.");
  }
  if (invoice.providerRef) await invoiceProvider().cancel(invoice.providerRef);
  const cancelled = await tx.invoice.update({
    where: { id: invoice.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });
  await tx.orderEvent.create({
    data: { orderId: invoice.orderId, type: "NOTE", message: `Fatura iptal edildi: ${invoice.number} — ${reason}`, actorUserId },
  });
  return cancelled;
}

// For flows where invoicing follows something that already happened
// (shipping, a refund): the invoice gets its own transaction, and a failure
// is logged for the admin to retry from the order page instead of undoing
// the shipment or refund.
export async function invoiceAfter(
  label: string,
  run: (tx: Prisma.TransactionClient) => Promise<unknown>
) {
  try {
    await prisma.$transaction(run);
  } catch (err) {
    console.error(`invoice after ${label} failed`, err);
  }
}
