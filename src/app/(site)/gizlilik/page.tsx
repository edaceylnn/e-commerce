import { InfoPage } from "@/components/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Yasal" title="Gizlilik Politikası">
      <p>
        Bu demo uygulamada gerçek kullanıcı verisi toplanmaz. Giriş formuna
        girilen e-posta ve isim yalnızca tarayıcı oturumunuzda imzalı bir
        JWT olarak saklanır; hiçbir sunucu veritabanına yazılmaz.
      </p>
      <h2>Çerezler</h2>
      <p>
        Oturum çerezi (httpOnly) ve basit bir A/B segment çerezi dışında
        izleme amaçlı çerez kullanılmaz.
      </p>
      <p className="text-xs text-ink-soft">
        Bu sayfa bir portföy demosu içindir; gerçek bir gizlilik politikası
        yerine geçmez.
      </p>
    </InfoPage>
  );
}
