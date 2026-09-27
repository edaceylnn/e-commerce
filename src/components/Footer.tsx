import Link from "next/link";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { FooterNewsletterForm } from "@/components/FooterNewsletterForm";

const SHOPPING_LINKS = [
  { href: "/products?filter=new", label: "Yeni gelenler" },
  ...PRODUCT_CATEGORIES.map((c) => ({
    href: `/products?category=${c.slug}`,
    label: c.label,
  })),
];

const HELP_LINKS = [
  { href: "/yardim/kargo-ve-teslimat", label: "Kargo & teslimat" },
  { href: "/yardim/iade-ve-degisim", label: "İade" },
  { href: "/yardim/sss", label: "Beden rehberi" },
  { href: "/iletisim", label: "İletişim" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2.5 font-sans text-body-sm text-ink-soft">
      <span className="text-caption font-semibold uppercase tracking-label text-ink">
        {title}
      </span>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="transition hover:text-ink">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-6 pb-8 pt-11 sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-7 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
          <Link href="/" className="font-sans text-lg font-extrabold tracking-logo">
            EDACEY
          </Link>
          <span className="text-body-sm leading-relaxed text-ink-soft">
            Evde, dışarıda,
            <br />
            kendin gibi.
          </span>
        </div>

        <FooterColumn title="Mağaza" links={SHOPPING_LINKS} />
        <FooterColumn title="Yardım" links={HELP_LINKS} />

        <div className="col-span-2 flex flex-col gap-2.5 lg:col-span-1">
          <span className="text-caption font-semibold uppercase tracking-label">Bülten</span>
          <FooterNewsletterForm />
          <span className="text-caption leading-relaxed text-ink-soft">
            © 2026 EDACEY. Tüm hakları saklıdır.
          </span>
        </div>
      </div>
    </footer>
  );
}
