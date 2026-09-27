import { AdminNotificationsForm } from "@/components/AdminNotificationsForm";
import { PageHeader } from "@/components/admin/PageHeader";

export default function AdminNotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Bildirimler"
        description="Web Push aboneliği olan tüm ziyaretçilere gönderilir. Abonelikler şu an global bir listede tutuluyor (kullanıcıya özel hedefleme Faz 5'te gelecek)."
      />
      <AdminNotificationsForm />
    </div>
  );
}
