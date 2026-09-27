export type OrderEventRow = {
  id: string;
  message: string;
  createdAt: Date;
  actorName: string | null;
};

// Renders the append-only OrderEvent log as a chronological timeline —
// replaces the old synthetic 4-step timeline that only ever showed the
// order's *current* state, not what actually happened and when (Bölüm 19).
// A filled dot + actor name marks a person's action; a hollow dot marks a
// system-triggered event (payment webhook, automated flow).
export function AdminOrderEventTimeline({ events }: { events: OrderEventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-adm-text-tertiary">Henüz bir olay kaydedilmedi.</p>;
  }

  return (
    <ol>
      {events.map((event, i) => (
        <li key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center pt-0.5">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                event.actorName
                  ? "border-adm-success bg-adm-success-soft text-adm-success"
                  : "border-adm-border bg-adm-surface-card text-adm-text-tertiary"
              }`}
            >
              {event.actorName ? "●" : "⚙"}
            </span>
            {i < events.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-adm-border" />}
          </div>
          <div className="pb-6">
            <p className="text-sm font-medium text-adm-text">{event.message}</p>
            <p className="mt-0.5 text-xs text-adm-text-tertiary">
              {event.createdAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
              {" · "}
              {event.actorName ?? "Sistem"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
