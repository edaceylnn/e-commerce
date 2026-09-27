import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { plusJakartaSans } from "@/lib/admin-fonts";

// Standalone back-office shell: no storefront Navbar/Footer here — this is a
// separate area for staff managing the catalog/orders, not the customer-facing
// site (see src/app/(site)/layout.tsx for that one). Unauthenticated or
// non-admin visitors are sent to the admin-only login, never the customer
// /account login. Visual chrome (sidebar/mobile drawer) lives in AdminShell,
// a client component, so this stays a server component for the auth check.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });

  return (
    <div className={plusJakartaSans.variable}>
      <AdminShell name={user?.name ?? undefined} email={user?.email}>
        {children}
      </AdminShell>
    </div>
  );
}
