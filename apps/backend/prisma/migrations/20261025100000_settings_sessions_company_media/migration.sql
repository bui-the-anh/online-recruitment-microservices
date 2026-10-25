-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "brand_name" VARCHAR(200);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "legal_name" VARCHAR(300);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "specialties" JSONB;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "offices" JSONB;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "contact_email" VARCHAR(320);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(500);
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64);
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "device_label" VARCHAR(160);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "notify_job_pending" BOOLEAN NOT NULL DEFAULT true,
    "notify_recruiter_registered" BOOLEAN NOT NULL DEFAULT true,
    "notify_browser_sound" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "user_settings"("user_id");

DO $$ BEGIN
  ALTER TABLE "user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
