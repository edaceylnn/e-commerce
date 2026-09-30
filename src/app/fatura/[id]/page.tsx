import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { amountInWords, displayLine } from "@/lib/invoicing/display";
import { SELLER } from "@/lib/invoicing/seller";
import { toKurus } from "@/lib/invoicing/tax";
import { carrierName } from "@/lib/shipping/carriers";
import { PrintButton } from "./PrintButton";

// The invoice as a printable A4 page (the browser's "Save as PDF" makes the
// PDF), laid out like a GİB e-Arşiv invoice: seller and document title on
// top, buyer beside the document details (özelleştirme, senaryo, tip, no,
// tarih, ETTN), the lines without VAT, totals, the amount in words, and
// the internet-sale details e-Arşiv asks for. Outside the store and admin
// layouts so it prints clean. Visible to admins and the order's owner only.

export const metadata: Metadata = { title: "Fatura — EDACEY", robots: { index: false } };

// Amounts in kuruş → "1.234,56"; unit prices may carry up to 4 decimals.
const tl = (kurus: number, maxDecimals = 2) =>
  `${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })} TL`;
const parts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
const day = (d: Date) => {
  const p = parts(d);
  return `${p.day}-${p.month}-${p.year}`;
};
const time = (d: Date) => {
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="border border-ink px-2 py-1 text-left font-medium">{label}</th>
      <td className="border border-ink px-2 py-1">{value}</td>
    </tr>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  if (!session) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { position: "asc" } },
      order: {
        select: {
          userId: true,
          orderNumber: true,
          paidAt: true,
          shipments: { orderBy: { createdAt: "asc" }, take: 1, select: { carrier: true, createdAt: true } },
        },
      },
      originalInvoice: { select: { number: true, issuedAt: true } },
    },
  });
  if (!invoice || (session.role !== "ADMIN" && invoice.order.userId !== session.userId)) notFound();

  const isReturn = invoice.type === "RETURN";
  const lines = invoice.lines.map((l) => {
    const k = { quantity: l.quantity, unitPrice: toKurus(l.unitPrice), discount: toKurus(l.discount), vatRate: Number(l.vatRate), net: toKurus(l.net) };
    return { ...l, vatRate: k.vatRate, vatK: toKurus(l.vat), netK: k.net, shown: displayLine(k) };
  });
  const gross = lines.reduce((s, l) => s + l.shown.amount, 0);
  const discount = lines.reduce((s, l) => s + l.shown.discount, 0);
  const byRate = new Map<number, { net: number; vat: number }>();
  for (const l of lines) {
    const acc = byRate.get(l.vatRate) ?? { net: 0, vat: 0 };
    acc.net += l.netK;
    acc.vat += l.vatK;
    byRate.set(l.vatRate, acc);
  }
  const rates = [...byRate.entries()].sort(([a], [b]) => b - a);
  const grandTotal = toKurus(invoice.grandTotal);
  const shipment = invoice.order.shipments[0];

  return (
    <div className="min-h-screen bg-[#e9e7e3] py-8 print:min-h-0 print:bg-white print:py-0">
      {/* A4 with a 12 mm margin; the browser's own margin setting should be "Varsayılan". */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between gap-4 px-4 print:hidden">
        <span className="text-sm text-text-3">Sipariş #{invoice.order.orderNumber}</span>
        <PrintButton />
      </div>

      <main className="mx-auto w-[210mm] max-w-full bg-white p-[12mm] text-[10.5px] leading-snug text-black shadow-md print:w-auto print:p-0 print:shadow-none">
        {invoice.provider === "simulator" && (
          <p className="mb-4 border border-black px-3 py-1.5 text-center text-[10px] font-medium">
            TEST BELGESİ — Simülatörle oluşturulmuştur; Gelir İdaresi Başkanlığı&apos;na iletilmemiştir ve mali değeri yoktur.
          </p>
        )}

        {/* Seller · document title */}
        <header className="grid grid-cols-[1fr_auto] items-start gap-6 border-b border-black pb-3">
          <div>
            <p className="text-[13px] font-semibold">{SELLER.name}</p>
            <p>{SELLER.address}</p>
            <p>Tel: {SELLER.phone} · E-posta: {SELLER.email}</p>
            <p>Web: {SELLER.website}</p>
            <p>Vergi Dairesi: {SELLER.taxOffice} · VKN: {SELLER.taxNumber}</p>
            <p>Mersis No: {SELLER.mersisNo} · Ticaret Sicil No: {SELLER.tradeRegistryNo}</p>
          </div>
          <div className="pt-1 text-right">
            <p className="text-[18px] font-semibold tracking-wide">e-Arşiv Fatura</p>
            {isReturn && <p className="text-[12px] font-semibold">İADE</p>}
          </div>
        </header>

        {/* Buyer · document details */}
        <section className="mt-3 grid grid-cols-[1fr_auto] items-start gap-6">
          <div className="border-b border-black pb-2">
            <p className="font-semibold">SAYIN</p>
            <p className="font-medium">{invoice.buyerName}</p>
            <p>{invoice.buyerAddress}</p>
            <p>E-posta: {invoice.buyerEmail}</p>
            <p>TCKN: {invoice.buyerIdentity}</p>
          </div>
          <table className="border-collapse text-[10px]">
            <tbody>
              <InfoRow label="Özelleştirme No" value="TR1.2" />
              <InfoRow label="Senaryo" value="EARSIVFATURA" />
              <InfoRow label="Fatura Tipi" value={isReturn ? "IADE" : "SATIS"} />
              <InfoRow label="Fatura No" value={invoice.number} />
              <InfoRow label="Fatura Tarihi" value={day(invoice.issuedAt)} />
              <InfoRow label="Fatura Saati" value={time(invoice.issuedAt)} />
              <InfoRow label="Sipariş No" value={invoice.order.orderNumber} />
            </tbody>
          </table>
        </section>
        <p className="mt-2">
          <span className="font-semibold">ETTN:</span> {invoice.ettn}
        </p>

        {invoice.status === "CANCELLED" && (
          <p className="mt-3 border-2 border-black px-3 py-1.5 text-center text-[12px] font-semibold">
            BU FATURA İPTAL EDİLMİŞTİR — {invoice.cancelledAt && day(invoice.cancelledAt)}
            {invoice.cancelReason && ` · ${invoice.cancelReason}`}
          </p>
        )}

        {/* Lines — prices without VAT: Miktar × Birim Fiyat − İskonto = Mal Hizmet Tutarı */}
        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#eee] print:bg-[#eee]">
              {["Sıra", "Mal Hizmet", "Miktar", "Birim Fiyat", "İskonto Tutarı", "KDV Oranı", "KDV Tutarı", "Mal Hizmet Tutarı"].map((h, i) => (
                <th key={h} className={`border border-black px-1.5 py-1 font-semibold ${i === 1 ? "text-left" : "w-px whitespace-nowrap text-right"} ${i === 0 ? "!text-center" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="break-inside-avoid">
                <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
                <td className="border border-black px-1.5 py-1">{l.description}</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">{l.quantity} Adet</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">{tl(l.shown.unitNet, 4)}</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">{tl(l.shown.discount)}</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">%{l.vatRate}</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">{tl(l.vatK)}</td>
                <td className="whitespace-nowrap border border-black px-1.5 py-1 text-right">{tl(l.netK)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 flex justify-end break-inside-avoid">
          <table className="border-collapse text-[10.5px]">
            <tbody>
              <InfoRow label="Mal Hizmet Toplam Tutarı" value={tl(gross)} />
              <InfoRow label="Toplam İskonto" value={tl(discount)} />
              {rates.map(([rate, t]) => (
                <InfoRow key={rate} label={`Hesaplanan KDV (%${rate}) — Matrah ${tl(t.net)}`} value={tl(t.vat)} />
              ))}
              <InfoRow label="Vergiler Dahil Toplam Tutar" value={tl(grandTotal)} />
              <tr>
                <th className="border-2 border-black px-2 py-1 text-left font-semibold">{isReturn ? "İade Edilecek Tutar" : "Ödenecek Tutar"}</th>
                <td className="whitespace-nowrap border-2 border-black px-2 py-1 text-right font-semibold">{tl(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <section className="mt-4 break-inside-avoid border border-black px-3 py-2 text-[10px]">
          <p>
            <span className="font-semibold">Yalnız:</span> {amountInWords(grandTotal)}
          </p>
          {isReturn && invoice.originalInvoice && (
            <p>
              <span className="font-semibold">İade edilen fatura:</span> {invoice.originalInvoice.number} ·{" "}
              {day(invoice.originalInvoice.issuedAt)}
            </p>
          )}
          <p className="mt-1.5 font-semibold">Bu satış internet üzerinden yapılmıştır.</p>
          <p>Web adresi: {SELLER.website} · Ödeme şekli: Kredi/Banka Kartı (iyzico)</p>
          <p>
            Ödeme tarihi: {invoice.order.paidAt ? day(invoice.order.paidAt) : "—"} · Gönderim tarihi:{" "}
            {shipment ? day(shipment.createdAt) : "—"} · Taşıyıcı: {shipment ? carrierName(shipment.carrier) : "—"}
          </p>
        </section>

        <footer className="mt-4 text-[9px] text-[#555]">
          {invoice.provider !== "simulator" && "e-Arşiv izni kapsamında elektronik ortamda iletilmiştir. "}
          Belge sağlayıcı: {invoice.provider}
          {invoice.providerRef && ` (${invoice.providerRef})`}.
        </footer>
      </main>
    </div>
  );
}
