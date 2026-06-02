-- CreateEnum
CREATE TYPE "JobModerationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "moderationStatus" "JobModerationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- Backfill: jobs that already existed were published before moderation existed,
-- so treat them as already approved. Only jobs created after this migration
-- will default to 'pending' and surface in the admin review queue.
UPDATE "Job" SET "moderationStatus" = 'approved' WHERE "createdAt" <= NOW();

-- CreateIndex
CREATE INDEX "Job_moderationStatus_idx" ON "Job"("moderationStatus");
