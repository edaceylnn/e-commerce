import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetConfirmForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = {
  title: "Yeni şifre — EDACEY",
  robots: { index: false },
  // The token is in the URL: don't pass it on to any other site.
  referrer: "no-referrer",
};

// The link from the reset email: /account/sifre-sifirla?token=…
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="page-x pb-24 pt-20 tab:pt-28 [&>*]:mx-auto [&>*]:max-w-[440px]">
      <span className="block text-caption uppercase tracking-eyebrow text-text-3">Hesabım</span>
      <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Yeni şifre belirle</h1>
      {token ? (
        <PasswordResetConfirmForm token={token} />
      ) : (
        <p className="mt-3 text-body font-light text-ink-soft">
          Bağlantı eksik görünüyor. E-postadaki bağlantıyı tekrar aç ya da{" "}
          <Link href="/account/sifremi-unuttum" className="underline underline-offset-4">
            yeni bir bağlantı iste
          </Link>
          .
        </p>
      )}
    </div>
  );
}
