import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPaymentSimulated } from "@/lib/iyzico";
import { CheckoutClient } from "@/components/CheckoutClient";

export const metadata: Metadata = { title: "Ödeme — EDACEY", robots: { index: false } };

// One-page checkout: addresses, the order and the pay button together.
export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/account");

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { id: "desc" },
  });

  return (
    <div className="page-x pb-24 pt-12">
      <CheckoutClient
        paymentSimulated={isPaymentSimulated()}
        savedAddresses={addresses.map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label ?? "",
          fullName: a.fullName,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          district: a.district,
          postalCode: a.postalCode,
        }))}
      />
    </div>
  );
}
