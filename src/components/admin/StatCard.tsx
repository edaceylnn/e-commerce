import Link from "next/link";
import { ComponentType } from "react";

export type StatCardAccent = "primary" | "success" | "warning" | "danger";
export type StatCardTrend = { direction: "up" | "down" | "flat"; label: string };

const ACCENT_TEXT: Record<StatCardAccent, string> = {
  primary: "text-adm-text-secondary",
  success: "text-adm-success",
  warning: "text-adm-warning",
  danger: "text-adm-danger",
};

const SPARKLINE_STROKE: Record<StatCardAccent, string> = {
  primary: "var(--adm-primary)",
  success: "var(--adm-success)",
  warning: "var(--adm-warning)",
  danger: "var(--adm-danger)",
};

function MiniSparkline({
  data,
  accent,
}: {
  data: number[];
  accent: StatCardAccent;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={SPARKLINE_STROKE[accent]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// KPI card — white surface, 1px border, no colored glow. A trend arrow
// carries semantic meaning (up = success, down = danger); the icon chip
// stays neutral so the accent color isn't spent on decoration.
export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  note,
  trend,
  accent = "primary",
  sparkline,
}: {
  label: string;
  value: string | number;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  note?: string;
  trend?: StatCardTrend;
  accent?: StatCardAccent;
  sparkline?: number[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between border border-adm-border bg-adm-surface-card p-5 transition-colors hover:border-adm-text-tertiary"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-adm-text-secondary">
          {label}
        </span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-adm-surface-secondary text-adm-text-secondary">
            <Icon className="h-[17px] w-[17px]" />
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="font-adm-headline text-[30px] font-semibold leading-none tracking-tight text-adm-text">
            {value}
          </div>
          {(trend || note) && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              {trend && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${
                    trend.direction === "up"
                      ? "text-adm-success"
                      : trend.direction === "down"
                        ? "text-adm-danger"
                        : "text-adm-text-secondary"
                  }`}
                >
                  {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "–"}{" "}
                  {trend.label}
                </span>
              )}
              {note && (
                <span className={trend ? "text-adm-text-tertiary" : ACCENT_TEXT[accent]}>
                  {note}
                </span>
              )}
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} accent={accent} />
        )}
      </div>
    </Link>
  );
}
