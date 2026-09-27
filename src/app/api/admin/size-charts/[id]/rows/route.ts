import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const rowsSchema = z.object({
  rows: z.array(
    z.object({
      sizeId: z.string().trim().min(1),
      measurements: z.record(z.string(), z.number()),
    })
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = rowsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const sizeChart = await prisma.sizeChart.findUnique({ where: { id } });
  if (!sizeChart) {
    return NextResponse.json({ error: "Beden tablosu bulunamadı." }, { status: 404 });
  }

  await prisma.$transaction(
    parsed.data.rows.map((row) =>
      prisma.sizeChartRow.upsert({
        where: { sizeChartId_sizeId: { sizeChartId: id, sizeId: row.sizeId } },
        update: { measurements: row.measurements },
        create: { sizeChartId: id, sizeId: row.sizeId, measurements: row.measurements },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
