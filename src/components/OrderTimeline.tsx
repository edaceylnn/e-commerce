// Order progress, derived strictly from the real status. A step is "done"
// only once it has actually happened; the step the order is waiting on is
// "current"; everything after is "upcoming". So an unpaid order shows
// "Sipariş alındı" done and "Ödeme bekleniyor" current — never a later
// stage looking reached. Vertical on mobile, horizontal from sm up.
type StepState = "done" | "current" | "upcoming";

const STEPS = [
  { key: "received", label: "Sipariş alındı" },
  { key: "paid", label: "Ödeme onaylandı", waitingLabel: "Ödeme bekleniyor" },
  { key: "preparing", label: "Hazırlanıyor" },
  { key: "shipped", label: "Kargoya verildi" },
  { key: "delivered", label: "Teslim edildi" },
] as const;

// Index of the step each status is waiting on (= number of steps done).
// TESLIM_EDILDI → all five done, nothing current.
const CURRENT_STEP: Record<string, number> = {
  PENDING_PAYMENT: 1,
  HAZIRLANIYOR: 2,
  KARGOLANDI: 3,
  TESLIM_EDILDI: 5,
};

const NOTE: Record<string, string> = {
  PENDING_PAYMENT: "Ödemeniz tamamlandığında siparişiniz hazırlanmaya başlar.",
  HAZIRLANIYOR: "Siparişiniz hazırlanıyor; kargoya verildiğinde takip numarası burada görünür.",
  KARGOLANDI: "Siparişiniz yolda.",
};

function stepState(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

export function OrderTimeline({ status }: { status: string }) {
  if (status === "IPTAL") {
    return <p className="border-l-2 border-danger pl-4 text-sm">Bu sipariş iptal edildi.</p>;
  }
  if (status === "IADE") {
    return (
      <p className="border-l-2 border-ink-soft pl-4 text-sm">
        Bu sipariş iade edildi ve ödemeniz geri gönderildi.
      </p>
    );
  }

  const current = CURRENT_STEP[status] ?? 0;
  const note = NOTE[status];

  return (
    <div>
      <ol className="flex flex-col gap-0 sm:flex-row">
        {STEPS.map((step, i) => {
          const state = stepState(i, current);
          const label =
            state === "current" && "waitingLabel" in step ? step.waitingLabel : step.label;
          // The line into the next step is filled once that step is reached.
          const lineDone = i + 1 <= current;
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex gap-3 pb-5 last:pb-0 sm:flex-1 sm:flex-col sm:gap-2.5 sm:pb-0"
            >
              {/* Connector to the next step: vertical on mobile, horizontal from sm. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-[5px] top-4 h-[calc(100%-0.5rem)] w-px sm:left-4 sm:top-[5px] sm:h-px sm:w-[calc(100%-1rem)] ${
                    lineDone ? "bg-ink" : "bg-line"
                  }`}
                />
              )}
              <span
                aria-hidden
                className={`relative z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full sm:mt-0 ${
                  state === "done"
                    ? "bg-ink"
                    : state === "current"
                      ? "border-2 border-ink bg-background"
                      : "border border-line-strong bg-background"
                }`}
              />
              <span
                className={`text-xs leading-snug sm:pr-3 ${
                  state === "upcoming" ? "text-ink-soft" : "font-medium text-ink"
                }`}
              >
                {label}
                <span className="sr-only">
                  {state === "done" ? " (tamamlandı)" : state === "current" ? " (şu anki adım)" : " (bekliyor)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {note && <p className="mt-5 text-xs text-ink-soft">{note}</p>}
    </div>
  );
}
