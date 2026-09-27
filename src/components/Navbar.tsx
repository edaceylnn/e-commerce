"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, selectCartCount } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { useHasMounted } from "@/lib/use-has-mounted";
import { ShoppingBagIcon } from "@/components/icons/ShoppingBagIcon";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { UserIcon } from "@/components/icons/AccountIcons";
import { MenuIcon, CloseIcon } from "@/components/icons/AdminIcons";
import { SearchToggle } from "@/components/SearchToggle";

const MARQUEE_ITEMS = [
  "SEZON SONU — SEÇİLİ LOUNGEWEAR %40",
  "₺1.500 ÜZERİ KARGO BEDAVA",
  "14 GÜN İADE",
];

function Marquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden whitespace-nowrap bg-ink py-2.5 font-mono text-caption font-medium tracking-eyebrow text-background">
      <div className="animate-marquee inline-block">
        {track.map((item, i) => (
          <span key={i} className="px-7">
            {item}
            <span className="pl-7 opacity-60">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Navbar() {
  const count = useCartStore(selectCartCount);
  // Avoid SSR/client hydration mismatch: cart count depends on localStorage.
  const mounted = useHasMounted();
  const [menuOpen, setMenuOpen] = useState(false);

  const hydrateWishlist = useWishlistStore((s) => s.hydrate);
  useEffect(() => {
    fetch("/api/wishlist")
      .then((res) => res.json())
      .then((data) => hydrateWishlist(data.productIds ?? []))
      .catch(() => {});
  }, [hydrateWishlist]);

  // Close the drawer on viewport resize past the mobile breakpoint, so it
  // never gets stuck open behind the desktop nav after a rotation/resize.
  useEffect(() => {
    if (!menuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  return (
    <>
      <Marquee />
      <header className="sticky top-0 z-20 border-b border-line bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={menuOpen}
              className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Link
              href="/"
              className="font-sans text-lg font-extrabold tracking-logo"
            >
              EDACEY
            </Link>
          </div>

          <nav className="hidden gap-6 text-body-sm font-medium uppercase tracking-label lg:flex">
            <Link href="/products?filter=new" className="border-b border-transparent pb-0.5 transition hover:border-ink">
              Yeni
            </Link>
            {PRODUCT_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="border-b border-transparent pb-0.5 transition hover:border-ink"
              >
                {c.label}
              </Link>
            ))}
            <Link
              href="/products?sort=discount"
              className="border-b border-transparent pb-0.5 text-accent transition hover:border-accent"
            >
              İndirim
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <SearchToggle />
            <Link
              href="/account/favoriler"
              aria-label="Favorilerim"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep sm:flex"
            >
              <HeartIcon className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/account"
              aria-label="Hesabım"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep sm:flex"
            >
              <UserIcon className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/cart"
              className="relative ml-1 flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-caption font-medium tracking-label transition hover:border-ink"
            >
              <span className="hidden sm:inline">SEPET</span>
              <ShoppingBagIcon className="h-[18px] w-[18px] sm:hidden" />
              <span className="hidden sm:inline">({mounted ? count : 0})</span>
              {mounted && count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs font-bold text-background sm:hidden">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Rendered outside <header> on purpose: the header's backdrop-blur
          establishes a containing block for `position: fixed` descendants,
          which would otherwise clip this drawer to the header's own height
          instead of the full viewport. */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            aria-label="Menüyü kapat"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-background px-5 pb-6 pt-5 shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <span className="font-sans text-lg font-extrabold tracking-logo">
                EDACEY
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Menüyü kapat"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1 text-sm font-semibold uppercase tracking-wide">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 transition hover:bg-cream-deep"
              >
                Anasayfa
              </Link>
              <Link
                href="/products?filter=new"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 transition hover:bg-cream-deep"
              >
                Yeni
              </Link>
              {PRODUCT_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 transition hover:bg-cream-deep"
                >
                  {c.label}
                </Link>
              ))}
              <Link
                href="/products?sort=discount"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 text-accent transition hover:bg-cream-deep"
              >
                İndirim
              </Link>
            </nav>

            <div className="mt-auto flex flex-col gap-4 border-t border-line pt-4 text-sm font-medium">
              <Link
                href="/account/favoriler"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 transition hover:bg-cream-deep"
              >
                <HeartIcon className="h-[18px] w-[18px]" />
                Favorilerim
              </Link>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 transition hover:bg-cream-deep"
              >
                <UserIcon className="h-[18px] w-[18px]" />
                Hesabım
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
