import { getAllSubscriptions, removeSubscription } from "@/lib/push/store";
import { getWebPush } from "@/lib/push/webpush";

// Shared by the manual "send to everyone" admin/account buttons and the
// automatic back-in-stock hook (see src/app/api/admin/products/[id]/route.ts).
export async function sendPushToAll(title: string, message: string) {
  const webpush = getWebPush();
  const subscriptions = await getAllSubscriptions();
  const payload = JSON.stringify({ title, message });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  await Promise.all(
    results.map((result, index) => {
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        // 404/410 mean the browser subscription is gone; stop targeting it.
        if (statusCode === 404 || statusCode === 410) {
          return removeSubscription(subscriptions[index].endpoint);
        }
      }
      return undefined;
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, total: subscriptions.length };
}
