-- AlterTable
ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "tax_code" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "contact_phone" VARCHAR(32);
