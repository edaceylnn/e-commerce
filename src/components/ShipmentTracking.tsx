import type { ShipmentSummary } from "@/lib/shipping/summary";

const dateTime = (d: Date) =>
  d.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// The customer's view of a shipment: carrier, tracking number (a link to
// the carrier's own tracking page where one is known), current status and
// every scan, newest first.
export function ShipmentTracking({ shipment }: { shipment: ShipmentSummary }) {
  return (
    <div className="space-y-5">
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Kargo firması</dt>
          <dd>{shipment.carrierName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Takip no</dt>
          <dd>
            {shipment.trackingUrl ? (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-ink"
              >
                {shipment.trackingNumber}
              </a>
            ) : (
              shipment.trackingNumber
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Durum</dt>
          <dd className="font-medium">{shipment.statusLabel}</dd>
        </div>
      </dl>

      {shipment.events.length > 0 && (
        <ol className="space-y-3 border-l border-line pl-4">
          {shipment.events.map((event, i) => (
            <li key={event.id} className="relative">
              <span
                className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-ink" : "bg-line"}`}
                aria-hidden
              />
              <p className={`text-sm ${i === 0 ? "font-medium" : ""}`}>{event.description}</p>
              <p className="text-xs text-ink-soft">
                {dateTime(event.occurredAt)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
