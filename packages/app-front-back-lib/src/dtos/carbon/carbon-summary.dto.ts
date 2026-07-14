import { z as zod } from "zod";
import { TripModeSchema } from "../trips/trip-planning.dto";
import { CarbonByModeSchema } from "./calculate-carbon.dto";

export const PeriodSchema = zod.enum(["week", "month", "year"]);
export type Period = zod.output<typeof PeriodSchema>;

// Un événement carbone = un segment-mode d'un trajet fait. Serveur (CarbonEntry)
// et client (TripRecord local) produisent la même forme, pour un agrégateur unique.
export const CarbonEventSchema = zod.object({
    tripId: zod.string(),
    takenAt: zod.string(),
    mode: TripModeSchema,
    distanceMeters: zod.number().min(0),
    carbonGrams: zod.number(),
    savedGrams: zod.number(),
});
export type CarbonEvent = zod.output<typeof CarbonEventSchema>;

export const CarbonBucketSchema = zod.object({
    label: zod.string(),
    carbonGrams: zod.number(),
    savedGrams: zod.number(),
});
export type CarbonBucket = zod.output<typeof CarbonBucketSchema>;

export const CarbonGoalSchema = zod.object({
    targetKg: zod.number(),
    achievedKg: zod.number(),
    percent: zod.number(),
});
export type CarbonGoal = zod.output<typeof CarbonGoalSchema>;

export const CarbonSummaryDtoInSchema = zod.object({
    period: PeriodSchema,
});
export type CarbonSummaryDtoIn = zod.output<typeof CarbonSummaryDtoInSchema>;

export const CarbonSummaryDtoOutSchema = zod.object({
    period: PeriodSchema,
    tripCount: zod.number(),
    totalCarbonGrams: zod.number(),
    totalSavedGrams: zod.number(),
    carReferenceGrams: zod.number(),
    savedPercent: zod.number(),
    equivalentCarKm: zod.number(),
    buckets: zod.array(CarbonBucketSchema),
    byMode: zod.array(CarbonByModeSchema),
    goal: CarbonGoalSchema.nullable(),
});
export type CarbonSummaryDtoOut = zod.output<typeof CarbonSummaryDtoOutSchema>;
