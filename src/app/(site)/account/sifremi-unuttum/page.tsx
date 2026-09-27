import Link from "next/link";
import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Şifremi unuttum — EDACEY",
};

// Target of the "Şifremi unuttum" link on the sign-in form. There is no
// e-mailed reset flow yet (it needs a mail provider and reset tokens), so this
// says so plainly and points to support instead of faking a reset form.
export default function ForgotPasswordPage() {
  return (
    <InfoPage eyebrow="Hesabım" title="Şifremi unuttum">
      <p>
        E-postayla şifre sıfırlama bağlantısı gönderme özelliği henüz hazır
        değil. Hesabınıza yeniden erişmek için hesabınızın e-posta adresiyle
        bize ulaşın; şifrenizi sıfırlamanıza yardımcı olalım.
      </p>
      <p className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/iletisim" className="font-medium text-ink underline underline-offset-4">
          İletişime geç
        </Link>
        <Link href="/account" className="underline underline-offset-4 hover:text-ink">
          Giriş sayfasına dön
        </Link>
      </p>
    </InfoPage>
  );
}
