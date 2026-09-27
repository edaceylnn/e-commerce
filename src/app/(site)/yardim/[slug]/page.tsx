import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

const TOPICS: Record<string, { title: string; body: ReactNode }> = {
  "siparis-takibi": {
    title: "Sipariş Takibi",
    body: (
      <>
        <p>
          Siparişiniz onaylandığı andan kargoya teslim edildiği ana kadar
          durumunu <strong>Hesabım → Siparişlerim</strong> sayfasından takip
          edebilirsiniz. Kargoya verilen siparişler için e-posta adresinize
          bir takip numarası gönderilir.
        </p>
        <h2>Sipariş durumları</h2>
        <ul>
          <li>Hazırlanıyor — siparişiniz depoda hazırlanıyor</li>
          <li>Kargoya verildi — takip numarası e-posta ile iletildi</li>
          <li>Dağıtımda — kargo şubesinden çıktı</li>
          <li>Teslim edildi</li>
        </ul>
        <p>
          Bu bir portföy demosudur; gerçek bir sipariş/kargo entegrasyonu
          bulunmamaktadır.
        </p>
      </>
    ),
  },
  "kargo-ve-teslimat": {
    title: "Kargo & Teslimat",
    body: (
      <>
        <p>
          Siparişleriniz, ödeme onayının ardından 1-3 iş günü içinde kargoya
          teslim edilir. Teslimat süresi bulunduğunuz bölgeye göre 1-5 iş
          günü arasında değişir.
        </p>
        <h2>Kargo ücreti</h2>
        <p>
          ₺1.500 ve üzeri siparişlerde kargo ücretsizdir. Bu tutarın
          altındaki siparişlerde sabit kargo ücreti uygulanır.
        </p>
      </>
    ),
  },
  "iade-ve-degisim": {
    title: "İade & Değişim",
    body: (
      <>
        <p>
          Ürünlerinizi teslim aldığınız tarihten itibaren 14 gün içinde,
          kullanılmamış ve orijinal ambalajında olmak koşuluyla iade
          edebilirsiniz.
        </p>
        <h2>İade nasıl yapılır?</h2>
        <ul>
          <li>
            <Link href="/iletisim">İletişim</Link> sayfasından sipariş
            numaranızla bize ulaşın
          </li>
          <li>Ürünü orijinal kutusuyla kargoya teslim edin</li>
          <li>Ödemeniz 5-7 iş günü içinde hesabınıza iade edilir</li>
        </ul>
        <p>
          Bu bir portföy demosudur; self-servis bir iade takip sistemi
          bulunmamaktadır.
        </p>
      </>
    ),
  },
  sss: {
    title: "Sıkça Sorulan Sorular",
    body: (
      <>
        <h2>Siparişimi nasıl iptal edebilirim?</h2>
        <p>
          Kargoya verilmemiş siparişler Hesabım → Siparişlerim sayfasından
          tek tıkla iptal edilebilir.
        </p>
        <h2>Ödeme seçenekleri nelerdir?</h2>
        <p>Kredi kartı ve banka kartı ile güvenli ödeme yapabilirsiniz.</p>
        <h2>Ürünler orijinal mi?</h2>
        <p>Tüm ürünlerimiz %100 orijinal ve resmi distribütör garantilidir.</p>
      </>
    ),
  },
};

// Exported so sitemap.ts can list every help article without duplicating
// this slug list by hand.
export const HELP_TOPIC_SLUGS = Object.keys(TOPICS);

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = TOPICS[slug];
  if (!topic) notFound();

  return (
    <InfoPage eyebrow="Yardım Merkezi" title={topic.title}>
      {topic.body}
    </InfoPage>
  );
}
