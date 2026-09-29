import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Ayarlar"
        description="Panel genelinde kullanılan iş kurallarını buradan yönetin."
      />
      <AdminSettingsForm
        initialVipSpendThreshold={Number(settings.vipSpendThreshold)}
        initialDefaultLowStockThreshold={settings.defaultLowStockThreshold}
      />
    </div>
  );
}
