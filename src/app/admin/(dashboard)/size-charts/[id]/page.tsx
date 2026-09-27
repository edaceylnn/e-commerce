import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminSizeChartEditor } from "@/components/AdminSizeChartEditor";

export default async function AdminSizeChartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sizeChart = await prisma.sizeChart.findUnique({
    where: { id },
    include: {
      sizeGroup: { include: { sizes: { orderBy: { position: "asc" } } } },
      rows: true,
    },
  });
  if (!sizeChart) {
    notFound();
  }

  const rowsBySizeId = new Map(sizeChart.rows.map((r) => [r.sizeId, r.measurements as Record<string, number>]));

  return (
    <div>
      <PageHeader
        eyebrow={sizeChart.sizeGroup.name}
        title={sizeChart.name}
        description="Her beden için ölçüleri girin — storefront'ta müşteri bu tabloyu görür."
      />

      <AdminSizeChartEditor
        sizeChartId={sizeChart.id}
        columns={sizeChart.columns}
        unit={sizeChart.unit}
        sizes={sizeChart.sizeGroup.sizes.map((s) => ({
          id: s.id,
          label: s.label,
          measurements: rowsBySizeId.get(s.id) ?? {},
        }))}
      />
    </div>
  );
}
