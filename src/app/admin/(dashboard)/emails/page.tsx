import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EMAIL_STATUS, EMAIL_TEMPLATE_LABELS } from "@/lib/email/labels";
import { skipReason } from "@/lib/email/outbox";

const TABLE_LIMIT = 100;

// The transactional email outbox: every email the store owed a customer,
// whether it went out, and what it said.
export default async function AdminEmailsPage() {
  const [emails, counts] = await Promise.all([
    prisma.emailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: TABLE_LIMIT,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.emailMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;
  const notSending = skipReason();

  return (
    <div>
      <PageHeader title="E-postalar" description="Müşterilere giden bilgilendirme e-postaları ve gönderim durumları." />

      {notSending && (
        <p className="mb-6 rounded-xl border border-adm-border bg-adm-surface-secondary px-4 py-3 text-sm text-adm-text-secondary">
          {notSending} E-postalar oluşturulup burada saklanıyor, ama müşteriye gönderilmiyor.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Gönderildi" value={String(count("SENT"))} />
        <KpiCard label="Sırada" value={String(count("QUEUED") + count("SENDING"))} note="birazdan gönderilecek" />
        <KpiCard label="Hata" value={String(count("FAILED"))} note="otomatik tekrar denenir" />
        <KpiCard label="Gönderilmedi" value={String(count("SKIPPED"))} note="yalnızca kayıt" />
      </div>

      <Card title="Son e-postalar">
        <AdminTable>
          <thead>
            <tr className="border-b border-adm-border text-[11px] font-medium uppercase tracking-wider text-adm-text-tertiary">
              <th className="py-3 pl-4 pr-4">E-posta</th>
              <th className="py-3 pr-4">Alıcı</th>
              <th className="py-3 pr-4">Sipariş</th>
              <th className="py-3 pr-4">Durum</th>
              <th className="py-3 pr-4 text-right">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-border">
            {emails.map((e) => (
              <tr key={e.id}>
                <td className="py-3 pl-4 pr-4">
                  <Link href={`/admin/emails/${e.id}`} className="font-semibold text-adm-text hover:underline">
                    {e.subject}
                  </Link>
                  <p className="text-xs text-adm-text-tertiary">{EMAIL_TEMPLATE_LABELS[e.template] ?? e.template}</p>
                </td>
                <td className="py-3 pr-4 text-adm-text-secondary">{e.to}</td>
                <td className="py-3 pr-4">
                  {e.order && e.orderId ? (
                    <Link href={`/admin/orders/${e.orderId}`} className="text-adm-primary hover:underline">
                      {e.order.orderNumber}
                    </Link>
                  ) : (
                    <span className="text-adm-text-tertiary">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge size="sm" variant={EMAIL_STATUS[e.status].variant}>
                    {EMAIL_STATUS[e.status].label}
                  </StatusBadge>
                </td>
                <td className="py-3 pr-4 text-right text-xs text-adm-text-tertiary">
                  {e.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
            {emails.length === 0 && <AdminTableEmpty colSpan={5}>Henüz e-posta yok.</AdminTableEmpty>}
          </tbody>
        </AdminTable>
      </Card>
    </div>
  );
}
