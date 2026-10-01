import { redirect } from "next/navigation";

// The two-step checkout (address, then review) became one page.
export default function LegacyCheckoutStep() {
  redirect("/checkout");
}
