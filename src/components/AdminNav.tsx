"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import { GridIcon, PackageIcon, BellIcon } from "@/components/icons/AccountIcons";
import { getInitials } from "@/lib/format";
import {
  WarehouseIcon,
  GroupIcon,
  CategoryGridIcon,
  SparklesIcon,
  BarChartIcon,
  WarningTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SyncIcon,
} from "@/components/icons/AdminLuxeIcons";
import {
  TruckIcon,
  TagIcon,
  ChatBubbleIcon,
  BadgeIcon,
  DropletIcon,
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
  label: string;
  links: NavLink[];
};

// Deliberately small while we validate the product-card flow: the three
// everyday screens stay on top, and every other page lives in one "Diğer"
// group that starts collapsed. Nothing is removed — the pages still work
// and are one click away.
const GROUPS: NavGroup[] = [
  {
    label: "Mağaza",
    links: [
      { href: "/admin", label: "Genel Bakış", Icon: GridIcon },
      { href: "/admin/products", label: "Ürünler", Icon: PackageIcon },
      { href: "/admin/orders", label: "Siparişler", Icon: TruckIcon },
    ],
  },
  {
    label: "Diğer",
    links: [
      { href: "/admin/stock", label: "Stok", Icon: WarehouseIcon },
      { href: "/admin/stock/movements", label: "Stok Hareketleri", Icon: LedgerIcon },
      { href: "/admin/stock/critical", label: "Kritik Stok", Icon: WarningTriangleIcon },
      { href: "/admin/categories", label: "Kategoriler", Icon: CategoryGridIcon },
      { href: "/admin/collections", label: "Koleksiyonlar", Icon: SparklesIcon },
      { href: "/admin/brands", label: "Markalar", Icon: BadgeIcon },
      { href: "/admin/colors", label: "Renkler", Icon: PaletteIcon },
      { href: "/admin/sizes", label: "Bedenler", Icon: RulerIcon },
      { href: "/admin/size-charts", label: "Beden Tabloları", Icon: SizeChartIcon },
      { href: "/admin/ingredients", label: "İçerikler", Icon: DropletIcon },
      { href: "/admin/returns", label: "İadeler", Icon: SyncIcon },
      { href: "/admin/users", label: "Müşteriler", Icon: GroupIcon },
      { href: "/admin/reviews", label: "Yorumlar", Icon: ChatBubbleIcon },
      { href: "/admin/campaigns", label: "Kampanyalar", Icon: TagIcon },
      { href: "/admin/analytics", label: "Raporlar", Icon: BarChartIcon },
      { href: "/admin/notifications", label: "Bildirimler", Icon: BellIcon },
      { href: "/admin/settings", label: "Ayarlar", Icon: GearIcon },
    ],
  },
];

const COLLAPSED_BY_DEFAULT = "Diğer";

const TRAILING_LINKS: NavLink[] = [];

export function AdminNav({
  onNavigate,
  name,
  email,
}: {
  onNavigate?: () => void;
  name?: string;
  email?: string;
}) {
  const pathname = usePathname();
  // "Diğer" starts collapsed unless the current page lives in it, so a
  // deep link never lands on a page whose menu entry is hidden.
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => {
    const other = GROUPS.find((g) => g.label === COLLAPSED_BY_DEFAULT);
    const inOther = other?.links.some((l) => isActivePath(pathname, l.href));
    return new Set(inOther ? [] : [COLLAPSED_BY_DEFAULT]);
  });

  function isActive(href: string) {
    return isActivePath(pathname, href);
  }

  function toggleGroup(label: string) {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function NavItem({ href, label, Icon }: NavLink) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-2.5 rounded-[9px] py-[7px] pl-3 pr-3 text-[13px] transition-colors ${
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
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-sm font-bold text-adm-sidebar-bg">
          H
        </span>
        <span className="text-[14px] font-bold tracking-tight text-white">EDACEY</span>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {GROUPS.map((group) => {
          const closed = closedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-adm-sidebar-section-label transition hover:bg-white/[0.04] hover:text-white/80"
                aria-expanded={!closed}
              >
                <span>{group.label}</span>
                {closed ? (
                  <ChevronRightIcon className="h-3 w-3" />
                ) : (
                  <ChevronDownIcon className="h-3 w-3" />
                )}
              </button>
              {!closed && (
                <div className="flex flex-col gap-0.5">
                  {group.links.map((link) => (
                    <NavItem key={link.href} {...link} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-adm-sidebar-border pt-3">
        {TRAILING_LINKS.map((link) => (
          <NavItem key={link.href} {...link} />
        ))}
      </div>

      {(name || email) && (
        <div className="mt-3 flex items-center gap-2.5 rounded-[10px] bg-white/[0.06] px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-adm-sidebar-bg">
            {getInitials(name, email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name || email}</p>
            <p className="truncate text-xs text-adm-sidebar-text-muted">Mağaza yöneticisi</p>
          </div>
        </div>
      )}
    </div>
  );
}

function isActivePath(pathname: string | null, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
}
