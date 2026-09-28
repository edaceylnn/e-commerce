import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { UrqlProvider } from "@/components/UrqlProvider";

// Storefront type system: a single family, Hanken Grotesk 300/400/500 — no
// serif, no mono (per the design handoff). The
// font-sans/font-display/font-mono tokens in globals.css all point here.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "EDACEY — Loungewear & Spor Giyim",
  description:
    "Evdeki rahatlığını günün her anına taşı. EDACEY'de loungewear, spor giyim ve pijama; evde, dışarıda, kendin gibi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <UrqlProvider>{children}</UrqlProvider>
      </body>
    </html>
  );
}
