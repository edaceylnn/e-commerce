"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCartStore, selectCartCount } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@/components/icons/Ph";

const ANNOUNCEMENTS = [
  `${formatPrice(FREE_SHIPPING_THRESHOLD)} üzeri siparişlerde kargo bedava`,
  "14 gün içinde kolay iade",
  "Sezon sonu — seçili loungewear %40",
  "Yeni sezon parçaları geldi",
];

// 32px bar that rotates through ANNOUNCEMENTS every 5s, with small
// previous/next carets. Scrolls away with the page; the header below it is
// the sticky part.
function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearInterval(t);
  }, [index]);

  const step = (d: number) =>
    setIndex((i) => (i + d + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);

  return (
    <div className="flex h-8 items-center justify-center gap-5 bg-cream text-caption uppercase tracking-[0.08em]">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Önceki duyuru"
        className="flex p-1 text-text-3"
      >
        <CaretLeftIcon />
      </button>
      <span aria-live="polite" className="min-w-0 text-center tab:min-w-[300px]">
        {ANNOUNCEMENTS[index]}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Sonraki duyuru"
        className="flex p-1 text-text-3"
      >
        <CaretRightIcon />
      </button>
    </div>
  );
}

type NavItem = { href: string; label: string; strong?: boolean; isActive: (p: URLSearchParams, path: string) => boolean };

const NAV_ITEMS: NavItem[] = [
  {
    href: "/products?filter=new",
    label: "Yeni Gelenler",
    strong: true,
    isActive: (p) => p.get("filter") === "new",
  },
  ...PRODUCT_CATEGORIES.map((c) => ({
    href: `/products?category=${c.slug}`,
    label: c.label,
    isActive: (p: URLSearchParams) => p.get("category") === c.slug,
  })),
  {
    href: "/products?sort=discount",
    label: "İndirim",
    isActive: (p) => p.get("sort") === "discount",
  },
];

function NavLinks({ activeHref }: { activeHref: string | null }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b py-1.5 transition-colors hover:border-ink ${
              active ? "border-ink" : "border-transparent"
            } ${item.strong ? "font-medium" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

// useSearchParams() needs a Suspense boundary to prerender (see Next.js
// docs), so the active-link reader is isolated here and falls back to an
// un-underlined nav instead of bailing the whole layout out to the client.
function ActiveNavLinks() {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = NAV_ITEMS.find((i) => i.isActive(params, pathname));
  return <NavLinks activeHref={active?.href ?? null} />;
}

function SearchRow({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = inputRef.current?.value.trim();
        onClose();
        router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
      }}
      className="border-t border-line"
    >
      <div className="page-x flex h-16 items-center gap-3.5">
      <MagnifyingGlassIcon className="shrink-0 text-text-3" />
      <input
        ref={inputRef}
        type="search"
        aria-label="Ara"
        placeholder="Loungewear, tayt, pijama takımı ara"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="min-w-0 flex-1 border-0 bg-transparent text-body-lg font-light text-ink outline-none placeholder:text-text-4"
      />
      <button type="button" onClick={onClose} className="text-nav uppercase tracking-nav">
        Kapat
      </button>
      </div>
    </form>
  );
}

export function Navbar() {
  const cartCount = useCartStore(selectCartCount);
  const wishCount = useWishlistStore((s) => s.ids.size);
  // Avoid SSR/client hydration mismatch: cart count depends on localStorage.
  const mounted = useHasMounted();
  const [searchOpen, setSearchOpen] = useState(false);

  const hydrateWishlist = useWishlistStore((s) => s.hydrate);
  useEffect(() => {
    fetch("/api/wishlist")
      .then((res) => res.json())
      .then((data) => hydrateWishlist(data.productIds ?? []))
      .catch(() => {});
  }, [hydrateWishlist]);

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-20 border-b border-line bg-background">
        {/* ≥1360px: one 64px row on a 1fr/auto/1fr grid, so the nav sits at
            the true centre of the page whatever the widths of the wordmark
            and the right-hand links. Below: the nav wraps onto its own
            full-width 44px row with a top hairline, scrolling sideways from
            the first item (safe centre). */}
        <div className="page-x flex flex-wrap items-center gap-x-10 hdr:grid hdr:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            className="flex h-16 items-center justify-self-start text-[17px] font-medium tracking-logo text-ink"
          >
            EDACEY
          </Link>

          <nav
            aria-label="Ana menü"
            className="no-scrollbar bleed-gutter order-3 flex h-11 min-w-0 basis-[calc(100%+2*var(--gutter))] items-center gap-[clamp(16px,2vw,30px)] overflow-x-auto border-t border-line text-nav uppercase tracking-nav [justify-content:safe_center] hdr:order-none hdr:mx-0 hdr:h-16 hdr:border-t-0 hdr:px-0"
          >
            <Suspense fallback={<NavLinks activeHref={null} />}>
              <ActiveNavLinks />
            </Suspense>
          </nav>

          <div className="ml-auto flex h-16 items-center gap-6 whitespace-nowrap text-nav uppercase tracking-nav hdr:ml-0 hdr:justify-self-end">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              className="uppercase"
            >
              Ara
            </button>
            <Link href="/account" className="hidden tab:inline">
              Hesabım
            </Link>
            <Link href="/account/favoriler" className="hidden tab:inline">
              Favoriler ({mounted ? wishCount : 0})
            </Link>
            <Link href="/cart">Sepet ({mounted ? cartCount : 0})</Link>
          </div>
        </div>

        {searchOpen && <SearchRow onClose={() => setSearchOpen(false)} />}
      </header>
    </>
  );
}
