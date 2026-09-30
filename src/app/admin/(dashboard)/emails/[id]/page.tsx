import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EMAIL_STATUS, EMAIL_TEMPLATE_LABELS } from "@/lib/email/labels";

const when = (d: Date | null) =>
  d ? d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }) : "—";

// One email as the customer sees it. The HTML is shown in a sandboxed
// iframe: no scripts, no access to the admin page around it.
export default async function AdminEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await prisma.emailMessage.findUnique({
    where: { id },
    include: { order: { select: { orderNumber: true } } },
  });
  if (!email) notFound();
  const status = EMAIL_STATUS[email.status];

  return (
    <div>
      <PageHeader title={email.subject} description={EMAIL_TEMPLATE_LABELS[email.template] ?? email.template} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card title="Önizleme">
          <iframe
            title="E-posta önizlemesi"
            sandbox=""
            srcDoc={email.html}
            className="h-[760px] w-full rounded-lg border border-adm-border bg-white"
          />
        </Card>
        <div className="space-y-6">
          <Card title="Gönderim">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-adm-text-secondary">Durum</dt>
                <dd>
                  <StatusBadge size="sm" variant={status.variant}>
                    {status.label}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-adm-text-secondary">Alıcı</dt>
                <dd className="truncate text-adm-text">{email.to}</dd>
              </div>
              {email.order && email.orderId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-adm-text-secondary">Sipariş</dt>
                  <dd>
                    <Link href={`/admin/orders/${email.orderId}`} className="text-adm-primary hover:underline">
                      {email.order.orderNumber}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-adm-text-secondary">Oluşturuldu</dt>
                <dd className="text-adm-text">{when(email.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-adm-text-secondary">Gönderildi</dt>
                <dd className="text-adm-text">{when(email.sentAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-adm-text-secondary">Deneme</dt>
                <dd className="text-adm-text">{email.attempts}</dd>
              </div>
            </dl>
            {email.lastError && <p className="mt-3 text-xs text-adm-text-secondary">{email.lastError}</p>}
          </Card>
          <Card title="Düz metin">
            <pre className="whitespace-pre-wrap break-words font-adm-body text-xs leading-relaxed text-adm-text-secondary">
              {email.text}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
