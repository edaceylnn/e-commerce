// Shared date-range bucketing for the admin dashboard's period filter
// (Bugün / Son 7 Gün / Son 30 Gün / Bu Yıl). Pure functions, no DB access —
// the page fetches raw orders for [previousStart, end) and this slices them
// into display buckets and computes the period-over-period comparison.
export type RangeKey = "today" | "7d" | "30d" | "year";

// Lives here (a plain server-safe module) rather than in the "use client"
// DateRangeFilter component — a Server Component importing a non-component
// value out of a client module doesn't reliably work under Turbopack.
export const DATE_RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Bugün" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "year", label: "Bu Yıl" },
];

export type RangeBucket = { start: Date; end: Date; label: string };

export type RangeConfig = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  buckets: RangeBucket[];
  chartSubtitle: string;
};

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
// JS Date.getDay(): 0 = Sunday
const DAY_LABELS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function getRangeConfig(range: RangeKey, now: Date = new Date()): RangeConfig {
  const end = new Date(now);
  let start: Date;
  let bucketUnit: "hour" | "day" | "month";
  let bucketCount: number;
  let chartSubtitle: string;

  switch (range) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      bucketUnit = "hour";
      bucketCount = 24;
      chartSubtitle = "Bugünün saatlik ciro dağılımı";
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      bucketUnit = "day";
      bucketCount = 30;
      chartSubtitle = "Son 30 günlük ciro";
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      bucketUnit = "month";
      bucketCount = now.getMonth() + 1;
      chartSubtitle = "Bu yılın aylık ciro dağılımı";
      break;
    case "7d":
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      bucketUnit = "day";
      bucketCount = 7;
      chartSubtitle = "Son 7 günlük ciro";
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime());
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  const buckets: RangeBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = new Date(start);
    const bucketEnd = new Date(start);
    if (bucketUnit === "hour") {
      bucketStart.setHours(start.getHours() + i);
      bucketEnd.setHours(start.getHours() + i + 1);
    } else if (bucketUnit === "day") {
      bucketStart.setDate(start.getDate() + i);
      bucketEnd.setDate(start.getDate() + i + 1);
    } else {
      bucketStart.setMonth(start.getMonth() + i, 1);
      bucketEnd.setMonth(start.getMonth() + i + 1, 1);
    }
    const label =
      bucketUnit === "hour"
        ? `${bucketStart.getHours()}:00`
        : bucketUnit === "day"
          ? bucketCount <= 10
            ? DAY_LABELS[bucketStart.getDay()]
            : `${bucketStart.getDate()}/${bucketStart.getMonth() + 1}`
          : MONTH_LABELS[bucketStart.getMonth()];
    buckets.push({ start: bucketStart, end: bucketEnd, label });
  }

  return { start, end, previousStart, previousEnd, buckets, chartSubtitle };
}

export function bucketRevenue(
  orders: { total: number; paidAt: Date | null }[],
  buckets: RangeBucket[]
): { label: string; value: number }[] {
  const values = buckets.map(() => 0);
  for (const order of orders) {
    if (!order.paidAt) continue;
    const idx = buckets.findIndex((b) => order.paidAt! >= b.start && order.paidAt! < b.end);
    if (idx >= 0) values[idx] += order.total;
  }
  return buckets.map((b, i) => ({ label: b.label, value: values[i] }));
}

export function percentChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
