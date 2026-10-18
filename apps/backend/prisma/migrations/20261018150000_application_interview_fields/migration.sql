-- AlterTable
ALTER TABLE "applications"
ADD COLUMN "interview_scheduled_at" TIMESTAMPTZ(6),
ADD COLUMN "interview_details" VARCHAR(500);
