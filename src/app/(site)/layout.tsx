import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/Toaster";

// Storefront chrome (navbar/footer) lives here, scoped to the (site) route
// group, so it never leaks into /admin — the seller-facing panel is a
// separate shell with its own sidebar (see src/app/admin/layout.tsx).
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster />
    </>
  );
}
