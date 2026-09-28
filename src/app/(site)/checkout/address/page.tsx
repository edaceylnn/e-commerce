import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutAddressForm } from "@/components/CheckoutAddressForm";

export default async function CheckoutAddressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { id: "desc" },
  });

  const savedAddresses = addresses.map((address) => ({
    id: address.id,
    type: address.type,
    label: address.label ?? "",
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    district: address.district,
    postalCode: address.postalCode,
  }));

  return (
    <div className="page-x py-12 [&>*]:max-w-2xl">
      <h1 className="font-light tracking-title text-4xl sm:text-5xl">
        Teslimat &amp; Fatura Adresi
      </h1>
      <div className="mt-8">
        <CheckoutAddressForm savedAddresses={savedAddresses} />
      </div>
    </div>
  );
}
