import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SIZE_CHART_COLUMN_KEYS } from "@/lib/sizeCharts";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.enum(["cm", "inch"]).optional(),
  columns: z
    .array(z.enum(SIZE_CHART_COLUMN_KEYS as [string, ...string[]]))
    .min(1)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  await prisma.sizeChart.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  // Products referencing this chart fall back to sizeChartId: null (see
  // schema's onDelete: SetNull) rather than being blocked — matches the PRD's
  // spec that a product just loses its size tab, no hard error.
  await prisma.sizeChart.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
