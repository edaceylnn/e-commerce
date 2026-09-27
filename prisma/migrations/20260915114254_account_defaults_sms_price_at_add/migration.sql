-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isDefaultBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifySms" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "priceAtAdd" DECIMAL(10,2);
