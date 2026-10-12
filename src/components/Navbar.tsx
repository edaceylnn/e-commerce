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
import { CaretLeftIcon, CaretRightIcon, HeartPhIcon, MagnifyingGlassIcon, UserIcon } from "@/components/icons/Ph";

const ANNOUNCEMENTS = [
  `${formatPrice(FREE_SHIPPING_THRESHOLD)} üzeri siparişlerde kargo bedava`,
  "14 gün içinde kolay iade",
  "Sezon sonu: seçili loungewear %40",
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
            className={`whitespace-nowrap border-b py-1.5 transition-colors hover:border-current ${
              active ? "border-current" : "border-transparent"
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

  // On the homepage the header starts transparent over the hero (light
  // text on the film and photo) and turns solid once the page scrolls, the
  // search opens or the pointer is on it. Every other page: always solid.
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);
  const transparent = overHero && !scrolled && !searchOpen && !hovered;

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
      <header
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`sticky top-0 z-20 border-b transition-colors duration-300 ${
          // Over the hero it takes no room: the hero slides up under it.
          overHero ? "-mb-[108px] hdr:-mb-16" : ""
        } ${transparent ? "border-transparent bg-transparent text-on-image" : "border-line bg-background text-ink"}`}
      >
        {transparent && (
          // Keeps the light text readable over the bright sky of the film.
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[150%] bg-gradient-to-b from-ink/35 to-transparent" />
        )}
        {/* ≥1200px: one 64px row on a 1fr/auto/1fr grid, so the nav sits at
            the true centre of the page whatever the widths of the wordmark
            and the right-hand links. Below: the nav wraps onto its own
            full-width 44px row with a top hairline, scrolling sideways from
            the first item (safe centre), its right edge fading out so a
            cut-off last item reads as "scroll for more". */}
        <div className="page-x flex flex-wrap items-center gap-x-4 tab:gap-x-10 hdr:grid hdr:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            className="flex h-16 items-center justify-self-start text-[17px] font-medium tracking-logo"
          >
            EDACEY
          </Link>

          <nav
            aria-label="Ana menü"
            className={`no-scrollbar bleed-gutter order-3 flex [mask-image:linear-gradient(to_right,#000_calc(100%-var(--gutter)-12px),transparent)] hdr:[mask-image:none] h-11 min-w-0 basis-[calc(100%+2*var(--gutter))] items-center gap-[clamp(16px,2vw,30px)] overflow-x-auto border-t ${transparent ? "border-on-image/30" : "border-line"} text-nav uppercase tracking-nav [justify-content:safe_center] hdr:order-none hdr:mx-0 hdr:h-16 hdr:border-t-0 hdr:px-0`}
          >
            <Suspense fallback={<NavLinks activeHref={null} />}>
              <ActiveNavLinks />
            </Suspense>
          </nav>

          {/* Below `tab` there's no room for the words (down to 360px), so
              search, account and favourites shrink to icons with an
              accessible name and a 36px tap area. */}
          <div className="ml-auto flex h-16 items-center gap-3 whitespace-nowrap text-nav uppercase tracking-nav tab:gap-6 hdr:ml-0 hdr:justify-self-end">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-label="Ara"
              className="-m-2 p-2 uppercase tab:m-0 tab:p-0"
            >
              <MagnifyingGlassIcon size={20} className="tab:hidden" />
              <span aria-hidden className="hidden tab:inline">Ara</span>
            </button>
            <Link href="/account" aria-label="Hesabım" className="-m-2 p-2 tab:m-0 tab:p-0">
              <UserIcon className="tab:hidden" />
              <span aria-hidden className="hidden tab:inline">Hesabım</span>
            </Link>
            <Link
              href="/account/favoriler"
              aria-label={`Favoriler (${mounted ? wishCount : 0})`}
              className="-m-2 p-2 tab:m-0 tab:p-0"
            >
              <HeartPhIcon className="tab:hidden" />
              <span aria-hidden className="hidden tab:inline">Favoriler ({mounted ? wishCount : 0})</span>
            </Link>
            <Link href="/cart">Sepet ({mounted ? cartCount : 0})</Link>
          </div>
        </div>

        {searchOpen && <SearchRow onClose={() => setSearchOpen(false)} />}
      </header>
    </>
  );
}
