-- AlterTable: Add GSC fields to Site
ALTER TABLE "Site" ADD COLUMN "gscPropertyUrl" TEXT;
ALTER TABLE "Site" ADD COLUMN "gscCredentials" JSONB;

-- CreateTable: MetaVariant (CTR Optimizer)
CREATE TABLE "MetaVariant" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "contentId" TEXT,
    "url" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "variantA" TEXT NOT NULL,
    "variantB" TEXT NOT NULL,
    "impressionsA" INTEGER NOT NULL DEFAULT 0,
    "clicksA" INTEGER NOT NULL DEFAULT 0,
    "impressionsB" INTEGER NOT NULL DEFAULT 0,
    "clicksB" INTEGER NOT NULL DEFAULT 0,
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'testing',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MetaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Location (Local SEO)
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "businessType" TEXT NOT NULL,
    "gbpPlaceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LocalRanking
CREATE TABLE "LocalRanking" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "mapPosition" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaVariant_siteId_status_idx" ON "MetaVariant"("siteId", "status");
CREATE INDEX "Location_siteId_idx" ON "Location"("siteId");
CREATE INDEX "LocalRanking_locationId_checkedAt_idx" ON "LocalRanking"("locationId", "checkedAt");

-- AddForeignKey
ALTER TABLE "MetaVariant" ADD CONSTRAINT "MetaVariant_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocalRanking" ADD CONSTRAINT "LocalRanking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
