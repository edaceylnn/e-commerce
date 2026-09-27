import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ field: z.enum(["isDefaultShipping", "isDefaultBilling"]) });

// Sets exactly one address as the user's default for shipping or billing —
// independent of the other flag, and independent of the address's own
// `type` (see the schema comment on Address.isDefaultShipping/Billing).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return NextResponse.json({ error: "Adres bulunamadı." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const { field } = parsed.data;

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: session.userId },
      data: { [field]: false },
    }),
    prisma.address.update({ where: { id }, data: { [field]: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
