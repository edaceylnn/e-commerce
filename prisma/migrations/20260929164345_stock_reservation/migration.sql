-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION';
ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION_RELEASE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reservedUntil" TIMESTAMP(3),
ADD COLUMN     "stockReleasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
