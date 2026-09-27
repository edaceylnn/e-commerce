-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "notifyMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyNewProducts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyOrderStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT;
