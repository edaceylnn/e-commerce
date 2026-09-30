import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InvoiceError, issueReturnInvoice, issueSaleInvoice } from "@/lib/invoicing/invoices";

const bodySchema = z.object({ type: z.enum(["SALE", "RETURN"]) });

// SALE: "Fatura kes" — issues the sale invoice now (normally automatic at
//   shipping). Asking twice returns the same invoice.
// RETURN: catches return documents up with refunds already made — every
//   refunded line not on a return yet, plus shipping once the whole order
//   was refunded. For when the automatic one after a refund failed.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const { id } = await params;

  try {
    if (parsed.data.type === "SALE") {
      const { invoice, created } = await prisma.$transaction((tx) => issueSaleInvoice(tx, id, session.userId));
      return NextResponse.json({ id: invoice.id, number: invoice.number, created });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { refundedAt: true, items: { where: { refundedAt: { not: null } }, select: { id: true } } },
    });
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const invoice = await prisma.$transaction((tx) =>
      issueReturnInvoice(
        tx,
        id,
        { orderItemIds: order.items.map((i) => i.id), includeShipping: order.refundedAt !== null },
        session.userId
      )
    );
    if (!invoice) {
      return NextResponse.json({ error: "İade faturası kesilecek iade edilmiş ürün yok." }, { status: 409 });
    }
    return NextResponse.json({ id: invoice.id, number: invoice.number, created: true });
  } catch (err) {
    if (err instanceof InvoiceError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
