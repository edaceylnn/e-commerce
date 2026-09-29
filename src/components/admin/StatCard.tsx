import Link from "next/link";

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

// Linked KPI card — same look as KpiCard (rounded, plain label, no icon
// chip), plus a hover state since the whole card is a link. A trend arrow
// carries semantic meaning (up = success, down = danger).
export function StatCard({
  label,
  value,
  href,
  note,
  trend,
  accent = "primary",
  sparkline,
}: {
  label: string;
  value: string | number;
  href: string;
  note?: string;
  trend?: StatCardTrend;
  accent?: StatCardAccent;
  sparkline?: number[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-adm-border bg-adm-surface-card p-4 transition-colors hover:border-adm-text-tertiary"
    >
      <p className="mb-2 text-xs font-semibold text-adm-text-secondary">{label}</p>

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-adm-text">
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
