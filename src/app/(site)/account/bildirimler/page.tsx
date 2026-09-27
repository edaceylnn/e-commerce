import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";

export default async function AccountNotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      notifyMarketing: true,
      notifyOrderStatus: true,
      notifyNewProducts: true,
      notifySms: true,
    },
  });
  if (!user) {
    redirect("/account");
  }

  return <NotificationPreferencesForm initial={user} />;
}
