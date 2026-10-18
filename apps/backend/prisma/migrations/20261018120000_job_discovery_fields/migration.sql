-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- AlterTable
ALTER TABLE "jobs"
ADD COLUMN "work_mode" "WorkMode" NOT NULL DEFAULT 'ONSITE',
ADD COLUMN "category" VARCHAR(80),
ADD COLUMN "experience_min" INTEGER,
ADD COLUMN "experience_max" INTEGER,
ADD COLUMN "fast_response" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "jobs_category_status_idx" ON "jobs"("category", "status");
