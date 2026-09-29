"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sizeChartColumnLabel } from "@/lib/sizeCharts";

type SizeRow = { id: string; label: string; measurements: Record<string, number | undefined> };

export function AdminSizeChartEditor({
  sizeChartId,
  columns,
  unit,
  sizes,
}: {
  sizeChartId: string;
  columns: string[];
  unit: string;
  sizes: SizeRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SizeRow[]>(sizes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCell(sizeId: string, column: string, value: string) {
    setSaved(false);
    setRows((prev) =>
      prev.map((row) =>
        row.id === sizeId
          ? { ...row, measurements: { ...row.measurements, [column]: value === "" ? undefined : Number(value) } }
          : row
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      rows: rows.map((row) => ({
        sizeId: row.id,
        measurements: Object.fromEntries(
          Object.entries(row.measurements).filter(([, v]) => typeof v === "number" && !Number.isNaN(v))
        ),
      })),
    };

    const res = await fetch(`/api/admin/size-charts/${sizeChartId}/rows`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Kaydedilemedi.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <div className="overflow-x-auto border border-adm-border bg-adm-surface-card rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adm-border/30 text-xs font-medium uppercase tracking-wider text-adm-text-tertiary">
              <th className="px-4 py-3 text-left">Beden</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left">
                  {sizeChartColumnLabel(col)} ({unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-border/15">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-adm-text">{row.label}</td>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={row.measurements[col] ?? ""}
                      onChange={(e) => updateCell(row.id, col, e.target.value)}
                      className="w-24 border border-adm-border bg-adm-surface-card p-2 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-adm-primary px-5 py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50 rounded-xl"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {saved && <span className="text-sm text-adm-success">Kaydedildi.</span>}
        {error && <span className="text-sm text-adm-error">{error}</span>}
      </div>
    </div>
  );
}
