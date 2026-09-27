"use client";

import { MouseEvent, useState } from "react";
import { formatPrice } from "@/lib/format";

export type RevenueBarPoint = { label: string; value: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_Y = 16;

// Paired grouped-bar chart (this period vs. previous period) — the
// dashboard's "Ciro" card in the Eylül 2026 design deck pairs a light-gray
// bar (previous) with a dark bar (current) per bucket, not a line. Hand-
// rolled inline SVG to match RevenueTrendChart's approach (no charting
// library), same hover-tooltip behavior.
export function RevenueBarChart({
  data,
  compareData,
  compareLabel = "Geçen dönem",
  currentLabel = "Bu dönem",
}: {
  data: RevenueBarPoint[];
  compareData?: RevenueBarPoint[];
  compareLabel?: string;
  currentLabel?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.value), ...(compareData?.map((d) => d.value) ?? []));
  const range = max || 1;
  const n = data.length;
  const groupWidth = WIDTH / Math.max(n, 1);
  const barWidth = Math.min(22, groupWidth * 0.3);
  const gap = barWidth * 0.25;
  const chartTop = PAD_Y;
  const chartBottom = HEIGHT - PAD_Y;
  const chartHeight = chartBottom - chartTop;

  function barHeight(value: number) {
    return (value / range) * chartHeight;
  }

  const showLabels = n <= 12;
  const active = hoverIndex !== null ? data[hoverIndex] : null;
  const activeCompare = hoverIndex !== null ? compareData?.[hoverIndex] : null;

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(relX / groupWidth)));
    setHoverIndex(idx);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-adm-text-secondary">
          <span className="h-2 w-2 rounded-full bg-adm-chart-ink" />
          {currentLabel}
        </span>
        {compareData && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-adm-text-secondary">
            <span className="h-2 w-2 rounded-full bg-adm-chart-muted" />
            {compareLabel}
          </span>
        )}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full cursor-crosshair"
          style={{ height: HEIGHT }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          role="img"
          aria-label={`${data.map((d) => `${d.label} ${formatPrice(d.value)}`).join(", ")}`}
        >
          <line x1={0} x2={WIDTH} y1={chartBottom} y2={chartBottom} stroke="var(--adm-border)" strokeWidth="1" />
          {data.map((d, i) => {
            const cx = i * groupWidth + groupWidth / 2;
            const compareVal = compareData?.[i]?.value ?? 0;
            const hCurrent = barHeight(d.value);
            const hCompare = compareData ? barHeight(compareVal) : 0;
            const isActive = hoverIndex === i;
            return (
              <g key={i} opacity={hoverIndex === null || isActive ? 1 : 0.45}>
                {compareData && (
                  <rect
                    x={cx - gap / 2 - barWidth}
                    y={chartBottom - hCompare}
                    width={barWidth}
                    height={hCompare}
                    rx={2}
                    fill="var(--adm-chart-muted)"
                  />
                )}
                <rect
                  x={compareData ? cx + gap / 2 : cx - barWidth / 2}
                  y={chartBottom - hCurrent}
                  width={barWidth}
                  height={hCurrent}
                  rx={2}
                  fill="var(--adm-chart-ink)"
                />
              </g>
            );
          })}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap border border-adm-border bg-adm-surface-card px-3 py-2 text-xs"
            style={{
              left: `${((hoverIndex! + 0.5) / n) * 100}%`,
              top: `${((chartBottom - barHeight(active.value)) / HEIGHT) * 100}%`,
            }}
          >
            <p className="font-semibold text-adm-text">{formatPrice(active.value)}</p>
            {activeCompare && (
              <p className="text-adm-text-tertiary">
                {compareLabel}: {formatPrice(activeCompare.value)}
              </p>
            )}
            <p className="text-adm-text-tertiary">{active.label}</p>
          </div>
        )}
      </div>
      {showLabels && (
        <div className="mt-1 flex text-xs text-adm-text-tertiary">
          {data.map((d, i) => (
            <span key={i} style={{ width: `${100 / n}%` }} className="text-center">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
