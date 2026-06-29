import { z as zod } from "zod";
import { TripModeSchema } from "../trips/trip-planning.dto";

export const CarbonSegmentSchema = zod.object({
    mode: TripModeSchema,
    distanceMeters: zod.number().min(0),
});
export type CarbonSegment = zod.output<typeof CarbonSegmentSchema>;

export const CalculateCarbonDtoInSchema = zod.object({
    segments: zod.array(CarbonSegmentSchema).min(1),
});
export type CalculateCarbonDtoIn = zod.output<typeof CalculateCarbonDtoInSchema>;

export const CarbonByModeSchema = zod.object({
    mode: TripModeSchema,
    carbonGrams: zod.number(),
    percent: zod.number(),
});
export type CarbonByMode = zod.output<typeof CarbonByModeSchema>;

export const CalculateCarbonDtoOutSchema = zod.object({
    totalCarbonGrams: zod.number(),
    byMode: zod.array(CarbonByModeSchema),
    carReferenceCarbonGrams: zod.number(),
    savedCarbonGrams: zod.number(),
    savedPercent: zod.number(),
    equivalentCarKilometers: zod.number(),
});
export type CalculateCarbonDtoOut = zod.output<typeof CalculateCarbonDtoOutSchema>;
