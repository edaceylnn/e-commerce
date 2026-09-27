import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountAddressBook } from "@/components/AccountAddressBook";
import { AccountCard } from "@/components/account/AccountCard";

export default async function AccountAddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const { new: newParam } = await searchParams;

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { id: "desc" },
  });

  const rows = addresses.map((address) => ({
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
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  }));

  return (
    <AccountCard>
      <AccountAddressBook addresses={rows} initialShowForm={newParam === "1"} />
    </AccountCard>
  );
}
