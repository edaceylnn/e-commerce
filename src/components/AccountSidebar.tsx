"use client";

import { usePathname, useRouter } from "next/navigation";
import { AccountNavItem } from "@/components/account/AccountNavItem";

const NAV_ITEMS = [
  { href: "/account", label: "Genel bakış" },
  { href: "/account/orders", label: "Siparişlerim" },
  { href: "/account/adresler", label: "Adreslerim" },
  { href: "/account/profil", label: "Profil" },
  { href: "/account/sifre-degistir", label: "Şifre" },
  { href: "/account/bildirimler", label: "Bildirimler" },
  { href: "/account/favoriler", label: "Favorilerim" },
];

function isActiveHref(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Left account navigation (columns 1–3, sticky) — a horizontal scrolling
// text-tab row below 760px. "Çıkış yap" is a quiet link at the end.
export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/account");
    router.refresh();
  }

  return (
    <nav
      aria-label="Hesap menüsü"
      className="no-scrollbar bleed-gutter flex items-center gap-6 overflow-x-auto border-b border-line tab:sticky tab:top-[132px] tab:mx-0 tab:flex-col tab:items-stretch tab:gap-0 tab:overflow-visible tab:border-0 tab:px-0 hdr:top-[88px]"
    >
      {NAV_ITEMS.map((item) => (
        <AccountNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          active={isActiveHref(pathname, item.href)}
        />
      ))}
      <button
        type="button"
        onClick={handleLogout}
        className="whitespace-nowrap py-2 text-left text-[12px] text-text-3 underline decoration-disabled underline-offset-4 transition-colors hover:text-ink max-tab:pb-1.5 tab:mt-10"
      >
        Çıkış yap
      </button>
    </nav>
  );
}
