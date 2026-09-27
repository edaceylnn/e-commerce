-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "coverage" TEXT,
ADD COLUMN     "finish" TEXT,
ADD COLUMN     "skinConcerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "texture" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "colorHex" TEXT;

