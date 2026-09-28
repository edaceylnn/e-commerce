import { getSession } from "@/lib/auth";
import { AccountSidebar } from "@/components/AccountSidebar";

// Design handoff → Account: "HESABIM" label + welcome headline over a
// hairline, then the text nav in columns 1–3 and the view in 4–12.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Logged-out visitors just see the page itself (the sign-in view on
  // /account) — the dashboard chrome below only makes sense once signed in.
  if (!session) {
    return <>{children}</>;
  }

  const firstName = session.name?.trim().split(/\s+/)[0];

  return (
    <div className="page-x pt-12 tab:pt-14">
      <div className="border-b border-line pb-7">
        <span className="text-caption uppercase tracking-eyebrow text-text-3">Hesabım</span>
        <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">
          {firstName ? `Tekrar hoş geldin, ${firstName}` : "Tekrar hoş geldin"}
        </h1>
      </div>

      <div className="grid grid-cols-12 items-start gap-x-2 gap-y-8 pt-6 tab:pt-10">
        <div className="col-span-12 tab:col-span-3">
          <AccountSidebar />
        </div>
        {/* The header already ends on a hairline, so the first section's own
            top rule (AccountCard / overview sections) is dropped. */}
        <div className="col-span-12 min-w-0 space-y-10 tab:col-start-4 tab:col-span-9 desk:col-start-4 desk:col-span-8 [&>*:first-child]:border-t-0 [&>*:first-child]:pt-0 [&>*:first-child>*:first-child]:border-t-0 [&>*:first-child>*:first-child]:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
