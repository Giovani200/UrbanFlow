-- CreateEnum
CREATE TYPE "ShareEndReason" AS ENUM ('ARRIVED', 'STOPPED', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shareConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "routineId" TEXT,
    "itinerary" JSONB,
    "destinationLabel" TEXT,
    "estimatedArrivalAt" TIMESTAMP(3),
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastPositionAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" "ShareEndReason",

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shares_userId_idx" ON "shares"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shares_tokenHash_key" ON "shares"("tokenHash");

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
