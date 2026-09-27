import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { refundOrder, refundOrderItems } from "@/lib/orders";
import { REFUND_REASONS } from "@/lib/refund-reasons";

const bodySchema = z.object({
  orderItemIds: z.array(z.string()).optional(),
  reason: z.enum(REFUND_REASONS).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const rawBody = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // No orderItemIds (or an empty request body, matching the existing "İade
  // Et" button) means refund the whole order — kısmi iade is opt-in.
  const reason = parsed.success ? parsed.data.reason : undefined;
  const result =
    parsed.success && parsed.data.orderItemIds && parsed.data.orderItemIds.length > 0
      ? await refundOrderItems(id, parsed.data.orderItemIds, { ip }, session.userId, reason)
      : await refundOrder(id, { ip }, session.userId, reason);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
