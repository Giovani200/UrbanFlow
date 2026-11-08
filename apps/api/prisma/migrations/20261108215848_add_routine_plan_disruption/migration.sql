-- AlterTable
ALTER TABLE "routine_day_plans" ADD COLUMN     "disrupted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notices" JSONB;
