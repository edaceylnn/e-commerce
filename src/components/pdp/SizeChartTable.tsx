import type { SizeChartView } from "@/lib/products";
import { sizeChartColumnLabel } from "@/lib/sizeCharts";

// Measurement table for the size-guide drawer and the "Kalıp & Ölçüler"
// accordion: hairline rows, 11px uppercase headers over a 1px ink rule.
export function SizeChartTable({ chart }: { chart: SizeChartView }) {
  return (
    <table className="w-full border-collapse text-left text-[13px] font-light">
      <thead>
        <tr className="border-b border-ink">
          <th className="py-2.5 text-caption font-normal uppercase tracking-label">Beden</th>
          {chart.columns.map((c) => (
            <th key={c} className="py-2.5 text-caption font-normal uppercase tracking-label">
              {sizeChartColumnLabel(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chart.rows.map((r) => (
          <tr key={r.size} className="border-b border-line">
            <td className="py-3">{r.size}</td>
            {chart.columns.map((c) => (
              <td key={c} className="py-3 text-ink-soft">
                {r.values[c] ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
