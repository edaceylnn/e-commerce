import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { plusJakartaSans } from "@/lib/admin-fonts";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div
      className={`${plusJakartaSans.variable} admin-shell flex min-h-screen items-center justify-center bg-adm-surface px-4 font-adm-body`}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-adm-headline text-2xl font-semibold uppercase tracking-tight text-adm-primary">
            Yönetim Paneli
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-adm-outline">
            Giriş Yap
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
