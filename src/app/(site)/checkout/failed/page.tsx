import { PillLink } from "@/components/Pill";

export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="page-x py-20 text-center [&>*]:mx-auto [&>*]:max-w-md">
      <h1 className="font-light tracking-title text-4xl">
        Ödeme Tamamlanamadı
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Ödeme işlemi sırasında bir sorun oluştu
        {order ? ` (sipariş ${order})` : ""}. Kartınızdan bir tutar
        çekilmediyse sepetiniz hâlâ duruyor — tekrar deneyebilirsiniz.
      </p>
      <div className="mt-6 flex justify-center">
        <PillLink href="/cart">Sepete Dön</PillLink>
      </div>
    </div>
  );
}
