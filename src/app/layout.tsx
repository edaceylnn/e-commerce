import type { Metadata } from "next";
import { Archivo, Instrument_Serif, DM_Mono } from "next/font/google";
import "./globals.css";
import { UrqlProvider } from "@/components/UrqlProvider";

// EDACEY brand type system: Archivo (body/UI), Instrument Serif (editorial
// headings — see the font-display token in globals.css), DM Mono (eyebrow
// labels, prices, pills).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${archivo.variable} ${instrumentSerif.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <UrqlProvider>{children}</UrqlProvider>
      </body>
    </html>
  );
}
