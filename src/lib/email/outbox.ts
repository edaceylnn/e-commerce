import { after } from "next/server";
import nodemailer, { type Transporter } from "nodemailer";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { carrierName, trackingUrl } from "@/lib/shipping/carriers";
import {
  orderCancelledEmail,
  orderConfirmedEmail,
  orderDeliveredEmail,
  orderShippedEmail,
  refundEmail,
  type OrderEmailData,
  type RenderedEmail,
} from "@/lib/email/templates";

// The transactional email outbox (see the EmailMessage model). queue*()
// runs inside the transaction that makes the change the email reports, so
// "order paid" and "confirmation email owed" commit together or not at all.
// deliverSoon() sends after the response; scripts/deliver-emails.ts retries
// whatever is left (a provider outage, a server restart mid-send).

const MAX_ATTEMPTS = 5;
// A SENDING row this old was abandoned mid-send (process died): try again.
const STUCK_AFTER_MS = 10 * 60_000;

export function siteUrl(path = "") {
  return `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "")}${path}`;
}

export async function queueEmail(
  tx: Prisma.TransactionClient,
  message: { dedupeKey: string; template: string; to: string; orderId?: string } & RenderedEmail
) {
  // Same key twice (a repeated webhook, a retried request): keep the first.
  const { count } = await tx.emailMessage.createMany({ data: [message], skipDuplicates: true });
  return count === 1;
}

async function orderEmailData(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      items: { include: { variant: { include: { color: true, size: true } } } },
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
      invoices: { where: { type: "SALE", status: "ISSUED" }, select: { id: true } },
    },
  });
  const a = order.shippingAddress;
  const data: OrderEmailData = {
    customerName: order.user.name,
    orderNumber: order.orderNumber,
    orderUrl: siteUrl(`/account/orders/${order.orderNumber}`),
    items: order.items.map((i) => ({
      title: i.title,
      detail: i.variant ? `${i.variant.color.name} / ${i.variant.size.label}` : null,
      quantity: i.quantity,
      lineTotal: Number(i.unitPrice) * i.quantity,
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discountTotal),
    shipping: Number(order.shippingCost),
    total: Number(order.total),
    address: `${a.fullName}, ${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.district} / ${a.city}`,
  };
  return { order, data };
}

export type OrderEmailKind = "order-confirmed" | "order-shipped" | "order-delivered" | "order-cancelled";

// One email per order per kind, however often it's asked for.
export async function queueOrderEmail(tx: Prisma.TransactionClient, kind: OrderEmailKind, orderId: string) {
  const { order, data } = await orderEmailData(tx, orderId);
  let rendered: RenderedEmail;
  if (kind === "order-shipped") {
    const shipment = order.shipments[0];
    if (!shipment) return false;
    rendered = orderShippedEmail({
      ...data,
      carrier: carrierName(shipment.carrier),
      trackingNumber: shipment.trackingNumber,
      trackingUrl: trackingUrl(shipment.carrier, shipment.trackingNumber),
      invoiceUrl: order.invoices[0] ? siteUrl(`/fatura/${order.invoices[0].id}`) : null,
    });
  } else if (kind === "order-delivered") {
    rendered = orderDeliveredEmail(data);
  } else if (kind === "order-cancelled") {
    rendered = orderCancelledEmail({ ...data, paid: order.paidAt !== null });
  } else {
    rendered = orderConfirmedEmail(data);
  }
  return queueEmail(tx, { dedupeKey: `${kind}:${orderId}`, template: kind, to: order.user.email, orderId, ...rendered });
}

// A refund email; `refundKey` tells separate partial refunds apart.
export async function queueRefundEmail(
  tx: Prisma.TransactionClient,
  orderId: string,
  refund: { refundKey: string; itemIds: string[]; full: boolean }
) {
  const { order, data } = await orderEmailData(tx, orderId);
  const items = order.items.filter((i) => refund.itemIds.includes(i.id));
  // Line totals less each line's discount share; the full refund adds
  // shipping — the same amounts the return invoice uses.
  const itemsKurus = items.reduce(
    (s, i) => s + Math.round(Number(i.unitPrice) * 100) * i.quantity - Math.round(Number(i.discountAmount) * 100),
    0
  );
  const amount = (itemsKurus + (refund.full ? Math.round(Number(order.shippingCost) * 100) : 0)) / 100;
  const rendered = refundEmail({ ...data, refundedItems: items.map((i) => i.title), amount, full: refund.full });
  return queueEmail(tx, {
    dedupeKey: `refund:${orderId}:${refund.refundKey}`,
    template: "refund",
    to: order.user.email,
    orderId,
    ...rendered,
  });
}

// ── Delivery ─────────────────────────────────────────────────────────────

type SendResult = { status: "SENT"; providerRef: string | null } | { status: "SKIPPED"; reason: string };

// Why nothing is sent, or null when an SMTP provider is configured.
export function skipReason() {
  if (isDemoMode()) return "Demo sitesi e-posta göndermez (yalnızca kayıt tutulur).";
  if (!process.env.SMTP_HOST) return "E-posta sağlayıcısı ayarlanmamış (SMTP_HOST).";
  return null;
}

let transport: Transporter | null = null;
async function send(message: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const reason = skipReason();
  if (reason) return { status: "SKIPPED", reason };
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "EDACEY <no-reply@edacey.example>",
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  return { status: "SENT", providerRef: info.messageId ?? null };
}

// A password-reset link must not stay readable in the outbox once it has
// been handed to the provider (admins can open the outbox).
const RESET_LINK = /(\/account\/sifre-sifirla\?token=)[A-Za-z0-9_-]+/g;
const redact = (s: string) => s.replace(RESET_LINK, "$1[gizlendi]");

export async function deliverEmail(id: string) {
  const now = new Date();
  // Claim it: only one delivery at a time, whoever gets here first.
  const { count } = await prisma.emailMessage.updateMany({
    where: {
      id,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { status: { in: ["QUEUED", "FAILED"] } },
        { status: "SENDING", lastAttemptAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
      ],
    },
    data: { status: "SENDING", attempts: { increment: 1 }, lastAttemptAt: now },
  });
  if (count === 0) return;
  const message = await prisma.emailMessage.findUniqueOrThrow({ where: { id } });

  let data: Prisma.EmailMessageUpdateInput;
  try {
    const result = await send(message);
    data =
      result.status === "SENT"
        ? { status: "SENT", sentAt: new Date(), providerRef: result.providerRef, provider: "smtp", lastError: null }
        : { status: "SKIPPED", lastError: result.reason };
  } catch (err) {
    data = { status: "FAILED", lastError: err instanceof Error ? err.message.slice(0, 500) : String(err) };
  }
  const final = data.status !== "FAILED" || message.attempts >= MAX_ATTEMPTS;
  if (final && message.template === "password-reset") {
    data.html = redact(message.html);
    data.text = redact(message.text);
  }
  await prisma.emailMessage.update({ where: { id }, data });
}

// Everything still owed, oldest first.
export async function deliverPending(limit = 50) {
  const pending = await prisma.emailMessage.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { status: { in: ["QUEUED", "FAILED"] } },
        { status: "SENDING", lastAttemptAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const { id } of pending) await deliverEmail(id);
  return pending.length;
}

// Send what was just queued once the response is out. Outside a request
// (scripts, tests) there is no "after": the retry job picks it up.
export function deliverSoon() {
  try {
    after(() => deliverPending().catch((err) => console.error("email delivery failed", err)));
  } catch {
    // not in a request scope
  }
}
