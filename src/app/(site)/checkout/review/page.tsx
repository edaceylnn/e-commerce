import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutReviewClient } from "@/components/CheckoutReviewClient";
import { isPaymentSimulated } from "@/lib/iyzico";

export default async function CheckoutReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ shippingAddressId?: string; billingAddressId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const { shippingAddressId, billingAddressId } = await searchParams;
  const [shippingAddress, billingAddress] = await Promise.all([
    shippingAddressId
      ? prisma.address.findUnique({ where: { id: shippingAddressId } })
      : null,
    billingAddressId
      ? prisma.address.findUnique({ where: { id: billingAddressId } })
      : null,
  ]);

  if (
    !shippingAddress ||
    shippingAddress.userId !== session.userId ||
    !billingAddress ||
    billingAddress.userId !== session.userId
  ) {
    redirect("/checkout/address");
  }

  const sameAddress = shippingAddress.id === billingAddress.id;

  return (
    <div className="page-x py-12 [&>*]:max-w-2xl">
      <h1 className="font-light tracking-title text-4xl sm:text-5xl">
        Sipariş Özeti
      </h1>

      <div className="mt-6 space-y-4">
        <div className="border border-line p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {sameAddress ? "Teslimat & Fatura Adresi" : "Teslimat Adresi"}
          </p>
          <p className="mt-1 font-medium">{shippingAddress.fullName}</p>
          <p className="text-ink-soft">
            {shippingAddress.line1}
            {shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""} —{" "}
            {shippingAddress.district}/{shippingAddress.city}
          </p>
        </div>

        {!sameAddress && (
          <div className="border border-line p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Fatura Adresi
            </p>
            <p className="mt-1 font-medium">{billingAddress.fullName}</p>
            <p className="text-ink-soft">
              {billingAddress.line1}
              {billingAddress.line2 ? `, ${billingAddress.line2}` : ""} —{" "}
              {billingAddress.district}/{billingAddress.city}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <CheckoutReviewClient
          shippingAddressId={shippingAddress.id}
          billingAddressId={billingAddress.id}
          paymentSimulated={isPaymentSimulated()}
        />
      </div>
    </div>
  );
}
