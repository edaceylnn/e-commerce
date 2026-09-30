import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminOrderStatusForm } from "@/components/AdminOrderStatusForm";
import { AdminOrderHeaderActions } from "@/components/AdminOrderHeaderActions";
import { AdminOrderEventTimeline } from "@/components/AdminOrderEventTimeline";
import { AdminOrderItemsPanel } from "@/components/AdminOrderItemsPanel";
import { isOrderRefundable, paymentStatusLabel } from "@/lib/order-status";
import { getInitials } from "@/lib/format";
import { Card } from "@/components/admin/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminShipmentPanel } from "@/components/AdminShipmentPanel";
import { AdminInvoicePanel } from "@/components/AdminInvoicePanel";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-adm-text-secondary">{label}</span>
      <span className="text-adm-text">{value}</span>
    </div>
  );
}

function AddressBlock({
  address,
}: {
  address: { fullName: string; line1: string; line2: string | null; city: string; district: string; phone: string };
}) {
  return (
    <div className="text-sm">
      <p className="font-medium text-adm-text">{address.fullName}</p>
      <p className="mt-0.5 text-adm-text-secondary">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
      </p>
      <p className="text-adm-text-secondary">
        {address.district}/{address.city}
      </p>
      <p className="mt-1 text-adm-text-tertiary">{address.phone}</p>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: true,
      shippingAddress: true,
      billingAddress: true,
      coupon: true,
      campaign: true,
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "desc" }, take: 1, include: { events: { orderBy: { occurredAt: "desc" } } } },
      invoices: { orderBy: { issuedAt: "asc" }, include: { lines: { select: { orderItemId: true } } } },
    },
  });
  if (!order) {
    notFound();
  }

  const customerStats = await prisma.order.aggregate({
    where: { userId: order.userId, paidAt: { not: null } },
    _sum: { total: true },
    _count: true,
  });

  const sameAddress = order.shippingAddressId === order.billingAddressId;
  // Invoicing state: a sale invoice can be issued once the order is paid
  // and not cancelled; a return document once refunded lines (or, after a
  // full refund, the shipping fee) aren't on a return yet.
  const activeSale = order.invoices.find((i) => i.type === "SALE" && i.status === "ISSUED");
  const returnedLines = new Set(
    order.invoices.filter((i) => i.type === "RETURN" && i.status === "ISSUED").flatMap((i) => i.lines.map((l) => l.orderItemId))
  );
  const canIssueSale = !activeSale && !!order.paidAt && ["HAZIRLANIYOR", "KARGOLANDI", "TESLIM_EDILDI"].includes(order.status);
  const canIssueReturn =
    !!activeSale &&
    (order.items.some((i) => i.refundedAt && !returnedLines.has(i.id)) ||
      (!!order.refundedAt && Number(order.shippingCost) > 0 && !returnedLines.has(null)));
  const discountLabel = order.coupon
    ? `İndirim (${order.coupon.code})`
    : order.campaign
      ? `İndirim (${order.campaign.name})`
      : "İndirim";

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Siparişler", href: "/admin/orders" }]}
        title={`#${order.orderNumber}`}
        badge={<OrderStatusBadge status={order.status} />}
        // Payment is only worth a word once money moved — an unpaid order's
        // badge already says "Ödeme Bekleniyor".
        meta={[
          order.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
          order.user.name,
          order.paidAt ? paymentStatusLabel(order.paidAt, order.status) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <AdminOrderHeaderActions
            orderId={order.id}
            status={order.status}
            paidAt={order.paidAt}
            refundedAt={order.refundedAt}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Ürünler">
            <AdminOrderItemsPanel
              orderId={order.id}
              items={order.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                title: item.title,
                thumbnail: item.thumbnail,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                refundedAt: item.refundedAt,
              }))}
              refundable={isOrderRefundable(order.status, order.paidAt, order.refundedAt)}
            />
            <div className="mt-4 space-y-2 border-t border-adm-border pt-4">
              <SummaryRow label="Ara toplam" value={formatPrice(Number(order.subtotal))} />
              {Number(order.discountTotal) > 0 && (
                <SummaryRow label={discountLabel} value={`-${formatPrice(Number(order.discountTotal))}`} />
              )}
              <SummaryRow
                label="Kargo"
                value={Number(order.shippingCost) === 0 ? "Ücretsiz" : formatPrice(Number(order.shippingCost))}
              />
              <div className="flex justify-between border-t border-adm-border pt-3 text-base font-semibold text-adm-text">
                <span>Toplam</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </Card>

          <Card title="Zaman Çizelgesi">
            <AdminOrderEventTimeline
              events={order.events.map((e) => ({
                id: e.id,
                message: e.message,
                createdAt: e.createdAt,
                actorName: e.actor?.name ?? null,
              }))}
            />
          </Card>

        </div>

        <div className="space-y-6">
          <Card title="Durum">
            <AdminOrderStatusForm
              // Remount when the order changes elsewhere (e.g. a shipping
              // webhook delivered it), so the form never holds a stale status.
              key={order.updatedAt.toISOString()}
              section="status"
              orderId={order.id}
              currentStatus={order.status}
              currentInternalNote={order.internalNote}
              currentUpdatedAt={order.updatedAt.toISOString()}
            />
          </Card>

          <Card title="Kargo">
            <AdminShipmentPanel
              orderId={order.id}
              orderStatus={order.status}
              shipment={
                order.shipments[0]
                  ? {
                      id: order.shipments[0].id,
                      carrier: order.shipments[0].carrier,
                      trackingNumber: order.shipments[0].trackingNumber,
                      status: order.shipments[0].status,
                      events: order.shipments[0].events.map((e) => ({
                        id: e.id,
                        status: e.status,
                        description: e.description,
                        location: e.location,
                        occurredAt: e.occurredAt.toISOString(),
                      })),
                    }
                  : null
              }
            />
          </Card>

          <Card title="Fatura">
            <AdminInvoicePanel
              orderId={order.id}
              canIssueSale={canIssueSale}
              canIssueReturn={canIssueReturn}
              invoices={order.invoices.map((i) => ({
                id: i.id,
                type: i.type,
                status: i.status,
                number: i.number,
                issuedAt: i.issuedAt.toISOString(),
                grandTotal: Number(i.grandTotal),
                cancelReason: i.cancelReason,
                cancellable:
                  i.status === "ISSUED" &&
                  !order.invoices.some((r) => r.originalInvoiceId === i.id && r.status === "ISSUED"),
              }))}
            />
          </Card>

          <Card title="Müşteri">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-adm-primary text-sm font-bold text-adm-on-primary">
                {getInitials(order.user.name, order.user.email)}
              </span>
              <div>
                <p className="text-sm font-semibold text-adm-text">{order.user.name}</p>
                <p className="text-xs text-adm-text-tertiary">
                  {customerStats._count} sipariş · {formatPrice(Number(customerStats._sum.total ?? 0))} harcama
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-adm-text-secondary">{order.user.email}</p>
          </Card>

          <Card title={sameAddress ? "Teslimat & Fatura Adresi" : "Teslimat Adresi"}>
            <AddressBlock address={order.shippingAddress} />
          </Card>

          {!sameAddress && (
            <Card title="Fatura Adresi">
              <AddressBlock address={order.billingAddress} />
            </Card>
          )}

          <Card title="İç not">
            <AdminOrderStatusForm
              // Remount when the order changes elsewhere (e.g. a shipping
              // webhook delivered it), so the form never holds a stale status.
              key={order.updatedAt.toISOString()}
              section="note"
              orderId={order.id}
              currentStatus={order.status}
              currentInternalNote={order.internalNote}
              currentUpdatedAt={order.updatedAt.toISOString()}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
