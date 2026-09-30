import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/PasswordResetForms";
import { isDemoMode } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Şifremi unuttum — EDACEY",
};

export default function ForgotPasswordPage() {
  return (
    <div className="page-x pb-24 pt-20 tab:pt-28 [&>*]:mx-auto [&>*]:max-w-[440px]">
      <span className="block text-caption uppercase tracking-eyebrow text-text-3">Hesabım</span>
      <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Şifremi unuttum</h1>
      {isDemoMode() ? (
        <p className="mt-3 text-body font-light text-ink-soft">
          Demo sitede şifre sıfırlama kapalı; giriş sayfasındaki demo hesabını kullanabilirsin.{" "}
          <Link href="/account" className="underline underline-offset-4">
            Giriş sayfası
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-3 text-body font-light text-ink-soft">
            Hesabının e-posta adresini yaz; şifreni sıfırlaman için bir bağlantı gönderelim.
          </p>
          <PasswordResetRequestForm />
        </>
      )}
    </div>
  );
}
