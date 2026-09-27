import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountProfileForm } from "@/components/AccountProfileForm";

export default async function AccountProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    redirect("/account");
  }

  return (
    <AccountProfileForm
      initialName={user.name}
      initialEmail={user.email}
      initialPhone={user.phone ?? ""}
      initialBirthDate={
        user.birthDate ? user.birthDate.toISOString().slice(0, 10) : ""
      }
    />
  );
}
