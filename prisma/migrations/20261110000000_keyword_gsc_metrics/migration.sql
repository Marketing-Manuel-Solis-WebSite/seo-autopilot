-- Search Console metrics per keyword (12 months and last 3 months)
ALTER TABLE "Keyword" ADD COLUMN IF NOT EXISTS "gscClicks" INTEGER;
ALTER TABLE "Keyword" ADD COLUMN IF NOT EXISTS "gscImpressions" INTEGER;
ALTER TABLE "Keyword" ADD COLUMN IF NOT EXISTS "gscCtr" DOUBLE PRECISION;
ALTER TABLE "Keyword" ADD COLUMN IF NOT EXISTS "gscClicks3m" INTEGER;
ALTER TABLE "Keyword" ADD COLUMN IF NOT EXISTS "gscImpressions3m" INTEGER;
