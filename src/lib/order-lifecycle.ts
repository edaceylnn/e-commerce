import { prisma } from "@/lib/db";
import { deliverSoon, queueOrderEmail } from "@/lib/email/outbox";
import { invoiceAfter, issueSaleInvoice } from "@/lib/invoicing/invoices";

// What follows an order status change, wherever it came from (a carrier
// webhook, the admin's "Kargoya Ver", the status dropdown): an order that
// has gone out gets its sale invoice, then the customer is told — with the
// invoice link, so the invoice comes first. Each step is idempotent, so a
// repeated webhook changes nothing, and neither can undo the status change
// that already happened: failures are logged for a retry.
export async function afterOrderStatusChange(orderId: string, status: string | null | undefined, actorUserId?: string) {
  if (status !== "KARGOLANDI" && status !== "TESLIM_EDILDI") return;
  await invoiceAfter("shipping", (tx) => issueSaleInvoice(tx, orderId, actorUserId));
  try {
    await prisma.$transaction((tx) =>
      queueOrderEmail(tx, status === "KARGOLANDI" ? "order-shipped" : "order-delivered", orderId)
    );
    deliverSoon();
  } catch (err) {
    console.error("order email after status change failed", err);
  }
}
