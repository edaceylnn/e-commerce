-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "iyzicoToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_iyzicoToken_key" ON "Order"("iyzicoToken");
