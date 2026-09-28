import Link from "next/link";

type FooterLink = { href: string; label: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Yardım",
    links: [
      { href: "/yardim/sss", label: "Yardım merkezi" },
      { href: "/yardim/kargo-ve-teslimat", label: "Kargo & teslimat" },
      { href: "/yardim/iade-ve-degisim", label: "İade & değişim" },
      { href: "/yardim/sss", label: "Beden rehberi" },
      { href: "/iletisim", label: "İletişim" },
    ],
  },
  {
    title: "Hesap",
    links: [
      { href: "/account", label: "Giriş yap" },
      { href: "/account/orders", label: "Siparişlerim" },
      { href: "/account/favoriler", label: "Favorilerim" },
      { href: "/yardim/siparis-takibi", label: "Kargo takibi" },
    ],
  },
  {
    title: "EDACEY",
    links: [
      { href: "/hakkimizda", label: "Hikayemiz" },
      { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli satış sözleşmesi" },
      { href: "/iletisim", label: "Bize ulaşın" },
    ],
  },
  {
    title: "Takip et",
    links: [
      { href: "https://www.instagram.com/", label: "Instagram", external: true },
      { href: "https://www.pinterest.com/", label: "Pinterest", external: true },
      { href: "https://www.tiktok.com/", label: "TikTok", external: true },
      { href: "https://www.youtube.com/", label: "YouTube", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-36 border-t border-line">
      {/* 2×2 on mobile; from 760px the four columns spread edge to edge, so
          the first starts on the page margin and the last ends on it — in
          line with the wordmark and © in the bottom bar. */}
      <div className="page-x grid grid-cols-2 gap-x-2 gap-y-10 pb-10 pt-14 tab:flex tab:justify-between tab:gap-10">
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-3 text-card">
            <span className="mb-1.5 text-caption uppercase tracking-eyebrow text-text-3">
              {col.title}
            </span>
            {col.links.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start transition-colors hover:text-text-3"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="self-start transition-colors hover:text-text-3"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-line">
      <div className="page-x flex flex-wrap items-center justify-between gap-6 pb-8 pt-6 text-nav text-text-3">
        <Link href="/" className="text-[13px] font-medium tracking-logo text-ink">
          EDACEY
        </Link>
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <span>Türkiye / Türkçe</span>
          <Link href="/gizlilik" className="transition-colors hover:text-ink">
            Gizlilik
          </Link>
          <Link href="/kullanim-kosullari" className="transition-colors hover:text-ink">
            Kullanım Koşulları
          </Link>
          <span>© 2026 EDACEY</span>
        </div>
      </div>
      </div>
    </footer>
  );
}
