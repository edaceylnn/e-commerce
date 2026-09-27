import { prisma } from "@/lib/db";
import { AdminReviewsTable } from "@/components/AdminReviewsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { PageTabs } from "@/components/admin/PageTabs";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  PENDING: "Bekleyen",
  APPROVED: "Onaylanan",
  REJECTED: "Reddedilen",
};

function isStatus(value: string): value is (typeof STATUSES)[number] {
  return (STATUSES as readonly string[]).includes(value);
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = status && isStatus(status) ? status : "PENDING";

  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
      where: { status: statusFilter },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.review.groupBy({ by: ["status"], _count: true }),
  ]);

  const countByStatus = new Map(counts.map((c) => [c.status, c._count]));

  const rows = reviews.map((review) => ({
    id: review.id,
    productTitle: review.product.title,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    verified: review.verified,
    status: review.status,
  }));

  return (
    <div>
      <PageHeader title="Yorumlar" />

      <PageTabs
        tabs={STATUSES.map((s) => ({
          href: s === "PENDING" ? "/admin/reviews" : `/admin/reviews?status=${s}`,
          label: STATUS_LABELS[s],
          count: countByStatus.get(s) ?? 0,
          active: statusFilter === s,
        }))}
      />

      <AdminReviewsTable reviews={rows} />
    </div>
  );
}
