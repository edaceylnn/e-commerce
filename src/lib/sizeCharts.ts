export const SIZE_CHART_COLUMNS = [
  { key: "chest", label: "Göğüs" },
  { key: "waist", label: "Bel" },
  { key: "hip", label: "Basen" },
  { key: "height", label: "Boy" },
] as const;

export type SizeChartColumnKey = (typeof SIZE_CHART_COLUMNS)[number]["key"];

export const SIZE_CHART_COLUMN_KEYS = SIZE_CHART_COLUMNS.map((c) => c.key);

export function sizeChartColumnLabel(key: string): string {
  return SIZE_CHART_COLUMNS.find((c) => c.key === key)?.label ?? key;
}
