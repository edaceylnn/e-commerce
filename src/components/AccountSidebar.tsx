"use client";

import { useState, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  GridIcon,
  PackageIcon,
  MapPinIcon,
  UserIcon,
  LockIcon,
  BellIcon,
  LogOutIcon,
  ChevronDownIcon,
} from "@/components/icons/AccountIcons";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { AccountNavItem } from "@/components/account/AccountNavItem";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Hesabım",
    items: [
      { href: "/account", label: "Genel Bakış", icon: GridIcon },
      { href: "/account/orders", label: "Siparişlerim", icon: PackageIcon },
      { href: "/account/adresler", label: "Adreslerim", icon: MapPinIcon },
      { href: "/account/favoriler", label: "Favorilerim", icon: HeartIcon },
    ],
  },
  {
    title: "Ayarlar",
    items: [
      { href: "/account/profil", label: "Hesap Bilgilerim", icon: UserIcon },
      { href: "/account/sifre-degistir", label: "Şifre Değiştir", icon: LockIcon },
      { href: "/account/bildirimler", label: "Bildirim Tercihleri", icon: BellIcon },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isActiveHref(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = ALL_ITEMS.find((item) => isActiveHref(pathname, item.href));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/account");
    router.refresh();
  }

  return (
    <>
      {/* Desktop: fixed-width vertical nav, same width on every account page */}
      <nav className="hidden w-64 shrink-0 sm:block">
        <div className="border border-line bg-background p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-1 last:mb-0">
              <p className="px-3 pb-1.5 pt-3 text-caption font-semibold uppercase tracking-label text-ink-soft">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <AccountNavItem
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isActiveHref(pathname, item.href)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-2 border-t border-line pt-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-cream-deep/50 hover:text-primary-dark"
            >
              <LogOutIcon className="h-[18px] w-[18px]" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile: collapsible dropdown showing the active page, expands into
          the same grouped list as desktop. */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between gap-3 border border-line bg-background px-4 py-3.5"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-primary">
            {activeItem && <activeItem.icon className="h-[18px] w-[18px]" />}
            {activeItem?.label ?? "Hesabım"}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 text-ink-soft transition ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 border border-line bg-background p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="mb-1 last:mb-0">
                <p className="px-3 pb-1.5 pt-3 text-caption font-semibold uppercase tracking-label text-ink-soft">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <AccountNavItem
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={isActiveHref(pathname, item.href)}
                        onClick={() => setMobileOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-cream-deep/50 hover:text-primary-dark"
              >
                <LogOutIcon className="h-[18px] w-[18px]" />
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
