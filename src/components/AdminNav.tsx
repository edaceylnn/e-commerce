"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { GridIcon, PackageIcon, BellIcon } from "@/components/icons/AccountIcons";
import { MailIcon } from "@/components/icons/AdminIcons";
import {
  WarehouseIcon,
  GroupIcon,
  CategoryGridIcon,
  SparklesIcon,
  BarChartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SyncIcon,
} from "@/components/icons/AdminLuxeIcons";
import {
  TruckIcon,
  TagIcon,
  ChatBubbleIcon,
  BadgeIcon,
  PaletteIcon,
  RulerIcon,
  SizeChartIcon,
  LedgerIcon,
  GearIcon,
} from "@/components/icons/AdminIcons";

type NavLink = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
  // No label: the group sits at the top, above the first heading.
  label?: string;
  links: NavLink[];
};

// Grouped by the job at hand — selling, the catalog, stock, the system —
// so every page is visible and one click away; nothing hides in a
// catch-all "Diğer". Groups fold, and stay folded across visits.
const GROUPS: NavGroup[] = [
  {
    links: [
      { href: "/admin", label: "Genel Bakış", Icon: GridIcon },
      { href: "/admin/analytics", label: "Raporlar", Icon: BarChartIcon },
    ],
  },
  {
    label: "Satış",
    links: [
      { href: "/admin/orders", label: "Siparişler", Icon: TruckIcon },
      { href: "/admin/returns", label: "İadeler", Icon: SyncIcon },
      { href: "/admin/users", label: "Müşteriler", Icon: GroupIcon },
      { href: "/admin/reviews", label: "Yorumlar", Icon: ChatBubbleIcon },
      { href: "/admin/campaigns", label: "Kampanyalar", Icon: TagIcon },
    ],
  },
  {
    label: "Katalog",
    links: [
      { href: "/admin/products", label: "Ürünler", Icon: PackageIcon },
      { href: "/admin/categories", label: "Kategoriler", Icon: CategoryGridIcon },
      { href: "/admin/collections", label: "Koleksiyonlar", Icon: SparklesIcon },
      { href: "/admin/brands", label: "Markalar", Icon: BadgeIcon },
    ],
  },
  {
    label: "Ürün Özellikleri",
    links: [
      { href: "/admin/colors", label: "Renkler", Icon: PaletteIcon },
      { href: "/admin/sizes", label: "Bedenler", Icon: RulerIcon },
      { href: "/admin/size-charts", label: "Beden Tabloları", Icon: SizeChartIcon },
    ],
  },
  {
    label: "Stok",
    links: [
      { href: "/admin/stock", label: "Stok Durumu", Icon: WarehouseIcon },
      { href: "/admin/stock/movements", label: "Stok Hareketleri", Icon: LedgerIcon },
    ],
  },
  {
    label: "Sistem",
    links: [
      { href: "/admin/emails", label: "E-postalar", Icon: MailIcon },
      { href: "/admin/notifications", label: "Bildirimler", Icon: BellIcon },
      { href: "/admin/settings", label: "Ayarlar", Icon: GearIcon },
    ],
  },
];

const STORAGE_KEY = "admin-nav-closed-groups";

function readClosedGroups(): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Every group starts open (also on the server render); a fold the admin
  // made on an earlier visit is applied once mounted.
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only state, read after hydration
    setClosedGroups(readClosedGroups());
  }, []);

  // Only the most specific match is active: on /admin/stock/movements,
  // "Stok Hareketleri" — not also its parent "Stok".
  const activeHref = GROUPS.flatMap((g) => g.links.map((l) => l.href))
    .filter((href) => isActivePath(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

  function isActive(href: string) {
    return href === activeHref;
  }

  function toggleGroup(label: string) {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Private mode / storage blocked: the fold just isn't remembered.
      }
      return next;
    });
  }

  function NavItem({ href, label, Icon }: NavLink) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-[9px] px-3 py-[5px] text-[13px] leading-[18px] transition-colors ${
          active
            ? "bg-adm-sidebar-active-bg font-semibold text-adm-sidebar-active-text"
            : "text-adm-sidebar-text hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center gap-2.5 px-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-sm font-bold text-adm-sidebar-bg">
          E
        </span>
        <span className="text-[14px] font-bold tracking-tight text-white">EDACEY</span>
      </div>

      <nav className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
        {GROUPS.map((group) => {
          // A group never folds away the page you're on.
          const closed =
            !!group.label &&
            closedGroups.has(group.label) &&
            !group.links.some((l) => l.href === activeHref);
          return (
            <div key={group.label ?? "top"}>
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label!)}
                  className="mb-0.5 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-adm-sidebar-section-label transition hover:text-white/80"
                  aria-expanded={!closed}
                >
                  <span>{group.label}</span>
                  {closed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                </button>
              )}
              {!closed && (
                <div className="flex flex-col gap-px">
                  {group.links.map((link) => (
                    <NavItem key={link.href} {...link} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </div>
  );
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
