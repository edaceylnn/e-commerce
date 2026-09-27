import { InfoPage } from "@/components/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage eyebrow="Hakkımızda" title="EDACEY">
      <p>
        EDACEY; loungewear, spor giyim ve pijama tasarlayan bir giyim
        markasıdır. Evde başlayan gün, dışarıda devam eder: hareket ederken
        özgür, yavaşlarken rahat hissettiren parçalar için varız.
      </p>
      <h2>Misyonumuz</h2>
      <p>
        Evdeki rahatlığı günün her anına taşıyan; evde, dışarıda, kendin gibi
        hissettiren parçalar tasarlamak.
      </p>
      <p className="text-xs text-ink-soft">
        Not: Bu sayfa bir portföy demosu içindir; gerçek bir şirketi temsil
        etmemektedir.
      </p>
    </InfoPage>
  );
}
