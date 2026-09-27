import { InfoPage } from "@/components/InfoPage";

export default function DistanceSalesAgreementPage() {
  return (
    <InfoPage eyebrow="Yasal" title="Mesafeli Satış Sözleşmesi">
      <p>
        İşbu sözleşme, alıcı ile satıcı arasında elektronik ortamda kurulan
        satış sözleşmesinin şartlarını düzenler.
      </p>
      <h2>Cayma Hakkı</h2>
      <p>
        Alıcı, teslim tarihinden itibaren 14 gün içinde herhangi bir gerekçe
        göstermeksizin sözleşmeden cayma hakkına sahiptir.
      </p>
      <p className="text-xs text-ink-soft">
        Bu sayfa bir portföy demosu içindir; gerçek bir hukuki sözleşme
        yerine geçmez.
      </p>
    </InfoPage>
  );
}
