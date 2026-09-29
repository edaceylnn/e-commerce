import { PillLink } from "@/components/Pill";

// `refund` is set by the payment callback when money was taken for an
// order that couldn't be shipped (sold out after the reservation lapsed,
// or cancelled mid-payment): "done" = refunded automatically, "manual" =
// iyzico refused and staff will refund by hand.
export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; refund?: string }>;
}) {
  const { order, refund } = await searchParams;
  const orderRef = order ? ` (sipariş ${order})` : "";

  let title = "Ödeme Tamamlanamadı";
  let body = `Ödeme işlemi sırasında bir sorun oluştu${orderRef}. Kartınızdan bir tutar çekilmediyse sepetiniz hâlâ duruyor — tekrar deneyebilirsiniz.`;
  if (refund === "done") {
    title = "Ürün Tükendi — Ödemeniz İade Edildi";
    body = `Ödemeniz alındı ancak siparişinizdeki ürün tükendiği için gönderemiyoruz${orderRef}. Çekilen tutarın tamamını iade ettik; kartınıza yansıması bankanıza göre birkaç iş günü sürebilir.`;
  } else if (refund === "manual") {
    title = "Ürün Tükendi — İadeniz Hazırlanıyor";
    body = `Ödemeniz alındı ancak siparişinizdeki ürün tükendiği için gönderemiyoruz${orderRef}. Otomatik iade tamamlanamadı; ekibimiz iadenizi en kısa sürede elle yapacak ve size bilgi verecek.`;
  }

  return (
    <div className="page-x py-20 text-center [&>*]:mx-auto [&>*]:max-w-md">
      <h1 className="font-light tracking-title text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-soft">{body}</p>
      <div className="mt-6 flex justify-center">
        <PillLink href="/cart">Sepete Dön</PillLink>
      </div>
    </div>
  );
}
