import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SIZE_CHART_COLUMN_KEYS } from "@/lib/sizeCharts";

const sizeChartSchema = z.object({
  name: z.string().trim().min(1, "Beden tablosu adı gerekli."),
  sizeGroupId: z.string().trim().min(1),
  unit: z.enum(["cm", "inch"]),
  columns: z
    .array(z.enum(SIZE_CHART_COLUMN_KEYS as [string, ...string[]]))
    .min(1, "En az bir ölçü kolonu seçilmeli."),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sizeChartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz form." },
      { status: 400 }
    );
  }

  const sizeGroup = await prisma.sizeGroup.findUnique({ where: { id: parsed.data.sizeGroupId } });
  if (!sizeGroup) {
    return NextResponse.json({ error: "Beden grubu bulunamadı." }, { status: 404 });
  }

  const sizeChart = await prisma.sizeChart.create({ data: parsed.data });
  return NextResponse.json({ id: sizeChart.id });
}
