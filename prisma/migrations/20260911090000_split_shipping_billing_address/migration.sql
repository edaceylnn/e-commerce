-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- AlterTable: Address gets a type/label for the account address book
ALTER TABLE "Address" ADD COLUMN     "type" "AddressType" NOT NULL DEFAULT 'SHIPPING';
ALTER TABLE "Address" ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- AlterTable: Order gets two address slots instead of one (nullable first
-- so we can backfill existing rows before enforcing NOT NULL).
ALTER TABLE "Order" ADD COLUMN     "shippingAddressId" TEXT;
ALTER TABLE "Order" ADD COLUMN     "billingAddressId" TEXT;

-- Backfill: existing orders used one address for both roles.
UPDATE "Order" SET "shippingAddressId" = "addressId", "billingAddressId" = "addressId";

ALTER TABLE "Order" ALTER COLUMN "shippingAddressId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "billingAddressId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_addressId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "addressId";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
