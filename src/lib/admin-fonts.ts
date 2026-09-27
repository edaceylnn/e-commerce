import { Plus_Jakarta_Sans } from "next/font/google";

// Single sans-serif for the whole admin back-office — a premium editorial
// dashboard reads as one clean typeface, not a serif/sans pairing. Applied
// via `${plusJakartaSans.variable}` on the admin layout/login wrapper;
// consumed as both `font-adm-headline` and `font-adm-body` (mapped in
// globals.css @theme inline) so existing heading classNames keep working.
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700"],
});
