-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'IADE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "iyzicoItemTransactions" JSONB,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
