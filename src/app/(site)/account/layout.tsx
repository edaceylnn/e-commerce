import { getSession } from "@/lib/auth";
import { AccountSidebar } from "@/components/AccountSidebar";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Logged-out visitors just see the page itself (the login/register card on
  // /account) — the dashboard chrome below only makes sense once signed in.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-10 sm:py-14">
      <div className="mb-8 sm:mb-10">
        <h1 className="font-display text-4xl sm:text-5xl">
          Hesabım
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Siparişlerinizi, adreslerinizi ve hesap bilgilerinizi buradan
          yönetebilirsiniz.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <AccountSidebar />
        <div className="min-w-0 flex-1 space-y-6 sm:space-y-8">{children}</div>
      </div>
    </div>
  );
}
