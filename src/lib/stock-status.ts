export type StockStatus = { variant: "success" | "warning" | "danger"; label: string };

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return { variant: "danger", label: "Tükendi" };
  if (stock <= 5) return { variant: "warning", label: `Son ${stock} ürün` };
  return { variant: "success", label: "Stokta" };
}
