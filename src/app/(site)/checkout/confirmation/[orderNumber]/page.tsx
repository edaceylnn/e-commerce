import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";
import { OrderSummary } from "@/components/OrderSummary";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { PillLink } from "@/components/Pill";

export default async function CheckoutConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const { orderNumber } = await params;
  const order = await getOrderForUser(orderNumber, session.userId);
  if (!order) {
    notFound();
  }

  return (
    <div className="page-x py-16 [&>*]:mx-auto [&>*]:max-w-2xl">
      <ClearCartOnMount />
      <div className="text-center">
        <h1 className="font-light tracking-title text-4xl">
          Siparişiniz Alındı ✓
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Teşekkürler! Sipariş onayınızı aşağıda bulabilirsiniz.
        </p>
      </div>

      <div className="mt-8 border border-line p-6">
        <OrderSummary order={order} />
      </div>

      <div className="mt-8 flex justify-center gap-3">
        {/* The outline pill is 48px, the solid one 52px: side by side they
            share the taller height so their edges line up. */}
        <PillLink href="/products" variant="outline" className="!h-[52px]">
          Alışverişe Devam Et
        </PillLink>
        <PillLink href="/account/orders">Siparişlerim</PillLink>
      </div>
    </div>
  );
}
