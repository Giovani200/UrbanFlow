-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "originLabel" TEXT NOT NULL,
    "destLat" DOUBLE PRECISION NOT NULL,
    "destLng" DOUBLE PRECISION NOT NULL,
    "destLabel" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "usualDepartureTime" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "lineIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_day_plans" (
    "routineId" TEXT NOT NULL,
    "serviceDay" TEXT NOT NULL,
    "itinerary" JSONB NOT NULL,
    "planB" JSONB,
    "planBStatus" TEXT NOT NULL,
    "alternatives" JSONB,
    "planOrigin" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_day_plans_pkey" PRIMARY KEY ("routineId")
);

-- CreateIndex
CREATE INDEX "routines_userId_idx" ON "routines"("userId");

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_day_plans" ADD CONSTRAINT "routine_day_plans_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
