import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrderDetailForUser } from "@/lib/orders";
import { OrderDetailView } from "@/components/OrderDetailView";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const { orderNumber } = await params;
  const order = await getOrderDetailForUser(orderNumber, session.userId);
  if (!order) {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
