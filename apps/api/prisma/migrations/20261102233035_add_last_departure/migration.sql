-- AlterTable
ALTER TABLE "favorite_addresses" ADD COLUMN     "isHome" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "preferences" ADD COLUMN     "lastDepartureDistanceMeters" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "lastDepartureWindowMinutes" INTEGER NOT NULL DEFAULT 120;
