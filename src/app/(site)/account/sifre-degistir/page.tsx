import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AccountPasswordForm } from "@/components/AccountPasswordForm";

export default async function AccountPasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  return <AccountPasswordForm />;
}
