import { redirect } from "next/navigation";

// Critical stock became a filter on the stock page.
export default function LegacyCriticalStockPage() {
  redirect("/admin/stock?durum=kritik");
}
