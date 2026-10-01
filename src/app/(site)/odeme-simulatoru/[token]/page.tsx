import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isPaymentSimulated } from "@/lib/iyzico";
import { SimulatedPaymentActions } from "./SimulatedPaymentActions";

// A payment page shows the exact amount, kuruş included.
const formatPrice = (lira: number) => lira.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export const metadata: Metadata = { title: "Test ödemesi — EDACEY", robots: { index: false } };

// Stands in for iyzico's hosted payment page on the demo (no iyzico keys):
// nothing is charged, the buyer picks the outcome. See
// src/lib/payment-simulator.ts.
export default async function SimulatedPaymentPage({ params }: { params: Promise<{ token: string }> }) {
  if (!isPaymentSimulated()) notFound();
  const { token } = await params;
  const payment = await prisma.simulatedPayment.findUnique({ where: { token } });
  if (!payment) notFound();
  const items = payment.basketItems as { id: string; name: string; price: string }[];
  const discountAndShipping = Number(payment.paidPrice) - Number(payment.price);

  return (
    <div className="page-x pb-24 pt-16 tab:pt-24 [&>*]:mx-auto [&>*]:max-w-[480px]">
      <span className="block text-caption uppercase tracking-eyebrow text-text-3">Güvenli ödeme</span>
      <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Test ödemesi</h1>
      <p className="mt-3 border border-line px-4 py-3 text-card text-ink-soft">
        Bu bir demo mağaza: ödeme adımı bir simülatördür, <strong>gerçek para çekilmez ve kart bilgisi istenmez</strong>.
        Gerçek kurulumda bu sayfanın yerini iyzico&apos;nun ödeme sayfası alır.
      </p>

      <dl className="mt-8 space-y-2 border-t border-line pt-6 text-card">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4">
            <dt className="text-ink-soft">{item.name}</dt>
            <dd>{formatPrice(Number(item.price))}</dd>
          </div>
        ))}
        {Math.abs(discountAndShipping) >= 0.01 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">İndirim ve kargo</dt>
            <dd>{discountAndShipping > 0 ? "+" : "−"}{formatPrice(Math.abs(discountAndShipping))}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-ink pt-3">
          <dt className="font-medium">Ödenecek tutar</dt>
          <dd className="text-2xl font-light tracking-title">{formatPrice(Number(payment.paidPrice))}</dd>
        </div>
      </dl>

      <div className="mt-8">
        {payment.outcome ? (
          <p className="text-card text-ink-soft">
            Bu ödeme tamamlandı.{" "}
            <Link href="/account/orders" className="underline underline-offset-4">
              Siparişlerim
            </Link>
          </p>
        ) : (
          <SimulatedPaymentActions token={token} />
        )}
      </div>
    </div>
  );
}
