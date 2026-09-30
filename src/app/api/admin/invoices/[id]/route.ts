import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelInvoice, InvoiceError } from "@/lib/invoicing/invoices";

const bodySchema = z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(200) });

// Cancels an invoice issued by mistake. An issued invoice is never edited
// or deleted — a wrong one is cancelled and a new one issued.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İptal nedeni yazın (en az 3 karakter)." }, { status: 400 });
  const { id } = await params;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const found = await tx.invoice.findUnique({ where: { id }, select: { orderId: true } });
      if (!found) throw new InvoiceError("Fatura bulunamadı.");
      // Same per-order lock as issuing, so a cancel can't race a return.
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${found.orderId} FOR UPDATE`;
      return cancelInvoice(tx, id, parsed.data.reason, session.userId);
    });
    return NextResponse.json({ id: invoice.id, status: invoice.status });
  } catch (err) {
    if (err instanceof InvoiceError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
