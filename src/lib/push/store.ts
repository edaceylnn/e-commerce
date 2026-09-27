import type { PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "@/lib/db";

export async function saveSubscription(
  sub: WebPushSubscription,
  userId?: string | null
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userId: userId ?? undefined,
    },
    update: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userId: userId ?? undefined,
    },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function getAllSubscriptions(): Promise<WebPushSubscription[]> {
  const rows = await prisma.pushSubscription.findMany();
  return rows.map((row) => ({
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }));
}
