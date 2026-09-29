-- CreateEnum
CREATE TYPE "ContentDraftKind" AS ENUM ('SHORT_DESCRIPTION', 'META_DESCRIPTION');

-- CreateEnum
CREATE TYPE "ContentDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "kind" "ContentDraftKind" NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'PENDING',
    "aiText" TEXT NOT NULL,
    "finalText" TEXT,
    "input" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentDraft_productId_idx" ON "ContentDraft"("productId");

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
