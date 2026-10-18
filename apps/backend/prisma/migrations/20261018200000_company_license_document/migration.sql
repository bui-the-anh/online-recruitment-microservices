-- AlterTable
ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "license_document_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "license_document_name" VARCHAR(200);
