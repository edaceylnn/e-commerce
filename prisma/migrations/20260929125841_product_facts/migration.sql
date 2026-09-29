-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "facts" TEXT;

-- Backfill: products whose description was already replaced by an approved
-- AI draft get back the description the first draft was generated from.
UPDATE "Product" p
SET "facts" = d."input"->>'description'
FROM (
  SELECT DISTINCT ON ("productId") "productId", "input"
  FROM "ContentDraft"
  WHERE "kind" = 'SHORT_DESCRIPTION'
  ORDER BY "productId", "createdAt" ASC
) d
WHERE p."id" = d."productId"
  AND p."facts" IS NULL
  AND COALESCE(d."input"->>'description', '') <> ''
  AND EXISTS (
    SELECT 1 FROM "ContentDraft" a
    WHERE a."productId" = p."id" AND a."kind" = 'SHORT_DESCRIPTION' AND a."status" = 'APPROVED'
  );
