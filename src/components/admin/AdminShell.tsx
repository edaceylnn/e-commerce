"use client";

import { FormEvent, ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { MenuIcon, CloseIcon } from "@/components/icons/AdminIcons";
import { BellIcon, LogOutIcon, UserIcon } from "@/components/icons/AccountIcons";

// Premium editorial admin shell ("Yönetim Paneli") — dark warm-neutral
// sidebar (never pure black), warm-ivory content area, a bordered search
// field instead of a floating pill. Desktop <aside> always exists in the
// DOM (hidden lg:flex) — the one Playwright's e2e specs target via
// page.locator("aside"). The mobile drawer is a second, conditionally
// rendered <aside> that only mounts while open, so it never coexists with
// the desktop one.
export function AdminShell({
  children,
  name,
  email,
}: {
  children: ReactNode;
  name?: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin?globalSearch=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="admin-shell min-h-screen bg-adm-bg font-adm-body text-adm-text">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-60 flex-col bg-adm-sidebar-bg px-2.5 pb-5 pt-6 lg:flex">
        <AdminNav name={name} email={email} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-adm-sidebar-bg px-3 pb-6 pt-6">
            <button
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="mb-4 self-end p-2 text-white/70 transition hover:bg-white/10"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <AdminNav onNavigate={() => setOpen(false)} name={name} email={email} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-adm-border bg-adm-bg/95 px-5 backdrop-blur-sm sm:px-7">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menüyü aç"
            className="p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <form
            onSubmit={handleSearch}
            className="flex w-full max-w-96 items-center gap-2 border border-adm-border bg-adm-surface-card px-3.5 py-2 transition focus-within:border-adm-text-tertiary"
          >
            <span className="text-adm-text-tertiary">
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Panel genelinde ara…"
              className="w-full bg-transparent text-sm text-adm-text outline-none placeholder:text-adm-text-tertiary"
            />
            <kbd className="hidden shrink-0 border border-adm-border px-1.5 py-0.5 text-[11px] font-medium text-adm-text-tertiary sm:block">
              ⌘K
            </kbd>
          </form>

          <div className="flex items-center gap-2">
            <button
              aria-label="Bildirimler"
              className="relative p-2 text-adm-text-secondary transition hover:bg-adm-surface-secondary"
            >
              <BellIcon className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Hesap menüsü"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-primary text-adm-on-primary"
              >
                <UserIcon className="h-[18px] w-[18px]" />
              </button>
              {menuOpen && (
                <>
                  <button
                    aria-label="Menüyü kapat"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden border border-adm-border bg-adm-surface-card py-1">
                    <Link
                      href="/"
                      className="block px-4 py-2.5 text-sm text-adm-text-secondary transition hover:bg-adm-surface-secondary"
                    >
                      Siteye Dön
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-adm-text-secondary transition hover:bg-adm-surface-secondary"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Çıkış Yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
