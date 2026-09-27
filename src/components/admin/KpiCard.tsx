export function KpiCard({
  label,
  value,
  trend,
  note,
  noteTone = "neutral",
}: {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; text: string };
  note?: string;
  noteTone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-xl border border-adm-border bg-adm-surface-card p-4">
      <p className="text-xs font-semibold text-adm-text-secondary">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-adm-text">
        {value}
      </p>
      {(trend || note) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          {trend && (
            <span
              className={`font-semibold ${
                trend.direction === "up" ? "text-adm-success" : "text-adm-danger"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.text}
            </span>
          )}
          {note && (
            <span className={noteTone === "danger" ? "text-adm-danger" : "text-adm-text-tertiary"}>
              {note}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
