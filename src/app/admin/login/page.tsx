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
      className={`${plusJakartaSans.variable} admin-shell flex min-h-screen items-center justify-center bg-adm-bg px-4 font-adm-body`}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-adm-primary text-base font-bold text-adm-on-primary">
            E
          </span>
          <h1 className="font-adm-headline text-2xl font-semibold tracking-tight text-adm-text">EDACEY</h1>
          <p className="mt-1 text-sm text-adm-text-secondary">Yönetim paneline giriş yapın</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
