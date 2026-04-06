-- AlterTable
ALTER TABLE "Site" ADD COLUMN "targetCountry" TEXT NOT NULL DEFAULT 'us';
ALTER TABLE "Site" ADD COLUMN "targetLanguage" TEXT NOT NULL DEFAULT 'en';
