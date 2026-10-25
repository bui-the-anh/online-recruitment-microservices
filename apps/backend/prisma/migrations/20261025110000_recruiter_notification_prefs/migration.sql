ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "notify_new_application" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "notify_job_moderation" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "notify_interview_reminder" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "notify_weekly_report" BOOLEAN NOT NULL DEFAULT false;
