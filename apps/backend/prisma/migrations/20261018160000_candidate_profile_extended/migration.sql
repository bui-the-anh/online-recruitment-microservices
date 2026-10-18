-- AlterTable
ALTER TABLE "candidate_profiles"
ADD COLUMN "bio" TEXT,
ADD COLUMN "experience_years" DECIMAL(4,1),
ADD COLUMN "level" VARCHAR(80),
ADD COLUMN "expected_salary_min" DECIMAL(12,2),
ADD COLUMN "expected_salary_max" DECIMAL(12,2),
ADD COLUMN "work_preference" VARCHAR(240),
ADD COLUMN "skills" JSONB,
ADD COLUMN "skill_levels" JSONB;
