import { InfoPage } from "@/components/InfoPage";

export default function ContactPage() {
  return (
    <InfoPage eyebrow="Bize Ulaşın" title="İletişim">
      <p>
        Sorularınız için aşağıdaki kanallardan bize ulaşabilirsiniz. Bu bir
        portföy demosu olduğundan mesajlar gerçek bir ekibe iletilmez.
      </p>
      <h2>İletişim Bilgileri</h2>
      <ul>
        <li>E-posta: destek@e-commerce.local</li>
        <li>Çalışma Saatleri: Hafta içi 09:00 – 18:00</li>
        <li>Adres: Örnek Mahallesi, Örnek Caddesi No:1, İstanbul</li>
      </ul>
    </InfoPage>
  );
}
