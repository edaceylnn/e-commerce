"use client";

import { MouseEvent, useState } from "react";
import { formatPrice } from "@/lib/format";

export type RevenueTrendPoint = { label: string; value: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 4;
const PAD_Y = 16;

function toPoints(data: RevenueTrendPoint[], max: number) {
  const range = max || 1;
  return data.map((d, i) => {
    const x = PAD_X + (i / Math.max(data.length - 1, 1)) * (WIDTH - PAD_X * 2);
    const y = PAD_Y + (1 - d.value / range) * (HEIGHT - PAD_Y * 2);
    return { x, y, ...d };
  });
}

function linePath(points: { x: number; y: number }[]) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

// Hand-rolled inline-SVG line/area chart, no charting library — a smooth
// single-accent line with an extremely subtle solid-opacity area fill (no
// gradient), clear hover tooltips, and an optional dashed comparison series
// for the previous period. Per-axis labels hide past 10 points (a 30-day
// view would be unreadable with one label per bar).
export function RevenueTrendChart({
  data,
  compareData,
  compareLabel = "Önceki dönem",
}: {
  data: RevenueTrendPoint[];
  compareData?: RevenueTrendPoint[];
  compareLabel?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.value), ...(compareData?.map((d) => d.value) ?? []));
  const points = toPoints(data, max);
  const comparePoints = compareData ? toPoints(compareData, max) : null;

  const areaBottom = HEIGHT - PAD_Y;
  const areaPath = `${linePath(points)} L ${points[points.length - 1]?.x.toFixed(1) ?? 0} ${areaBottom} L ${points[0]?.x.toFixed(1) ?? 0} ${areaBottom} Z`;

  const showLabels = data.length <= 10;
  const active = hoverIndex !== null ? points[hoverIndex] : null;
  const activeCompare = hoverIndex !== null ? comparePoints?.[hoverIndex] : null;

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div>
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
          <path d={areaPath} fill="var(--adm-primary)" opacity="0.06" stroke="none" />
          {comparePoints && (
            <path
              d={linePath(comparePoints)}
              fill="none"
              stroke="var(--adm-text-tertiary)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}
          <path
            d={linePath(points)}
            fill="none"
            stroke="var(--adm-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_Y}
              y2={HEIGHT - PAD_Y}
              stroke="var(--adm-border)"
              strokeWidth="1"
            />
          )}
          {activeCompare && (
            <circle cx={activeCompare.x} cy={activeCompare.y} r="3" fill="var(--adm-text-tertiary)" />
          )}
          {active && (
            <circle
              cx={active.x}
              cy={active.y}
              r="4"
              fill="var(--adm-primary)"
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap border border-adm-border bg-adm-surface-card px-3 py-2 text-xs"
            style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
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
        <div className="mt-1 flex justify-between text-xs text-adm-text-tertiary">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
