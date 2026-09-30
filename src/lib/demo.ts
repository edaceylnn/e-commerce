// Public demo mode (DEMO_MODE=1 on the demo server). Visitors get shared
// demo accounts and may try every flow — ship, invoice, refund — and the
// database is reset to sample data every night (scripts/demo-reset.ts).
// What stays blocked is whatever would spoil the demo for the next visitor
// before that reset: deleting things, changing users, roles or store
// settings, and changing the shared accounts' email or password. Password
// reset is off too: every demo email lands in the outbox the demo admin can
// read, so it would hand out other visitors' reset links.

export function isDemoMode() {
  return process.env.DEMO_MODE === "1";
}

// Shown on the login pages in demo mode; public on purpose.
export const DEMO_ACCOUNTS = {
  admin: { email: "demo-admin@edacey.demo", password: "demo-admin-2026", name: "Demo Admin" },
  customer: { email: "demo@edacey.demo", password: "demo-musteri-2026", name: "Demo Müşteri" },
} as const;

export function isDemoAccount(email: string | undefined) {
  return email === DEMO_ACCOUNTS.admin.email || email === DEMO_ACCOUNTS.customer.email;
}

// Why a request is refused in demo mode, or null when it's allowed.
export function demoBlockReason(method: string, pathname: string, sessionEmail?: string): string | null {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  if (pathname.startsWith("/api/admin/")) {
    if (method === "DELETE") return "Demo modunda silme kapalı.";
    if (pathname.startsWith("/api/admin/users/") || pathname === "/api/admin/settings") {
      return "Demo modunda kullanıcılar ve mağaza ayarları değiştirilemez.";
    }
  }
  if (pathname.startsWith("/api/auth/password-reset")) return "Demo modunda şifre sıfırlama kapalı.";
  if ((pathname === "/api/account/password" || pathname === "/api/account/profile") && isDemoAccount(sessionEmail)) {
    return "Demo hesabının e-posta ve şifresi değiştirilemez.";
  }
  return null;
}
