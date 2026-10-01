import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isPaymentSimulated } from "@/lib/iyzico";
import { completeSimulatedPayment } from "@/lib/payment-simulator";

const bodySchema = z.object({ outcome: z.enum(["SUCCESS", "FAILURE"]) });

// The buyer's choice on the simulated payment page. Answers with the
// store's callback URL; the page then posts the token there, the way
// iyzico's hosted page does.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!isPaymentSimulated()) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const { token } = await params;
  const payment = await prisma.simulatedPayment.findUnique({ where: { token }, select: { callbackUrl: true } });
  if (!payment) return NextResponse.json({ error: "Ödeme bulunamadı." }, { status: 404 });
  if (!(await completeSimulatedPayment(token, parsed.data.outcome))) {
    return NextResponse.json({ error: "Bu ödeme zaten tamamlandı." }, { status: 409 });
  }
  return NextResponse.json({ callbackUrl: payment.callbackUrl });
}
