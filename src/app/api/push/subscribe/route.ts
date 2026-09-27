import { NextRequest, NextResponse } from "next/server";
import { saveSubscription, removeSubscription } from "@/lib/push/store";
import { getSession } from "@/lib/auth";
import type { PushSubscription as WebPushSubscription } from "web-push";

export async function POST(request: NextRequest) {
  const subscription = (await request.json()) as WebPushSubscription;

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Scoped to the signed-in user when there is one; anonymous subscriptions
  // (not everyone wanting stock alerts is logged in) are still allowed.
  const session = await getSession();
  await saveSubscription(subscription, session?.userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (endpoint) await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
