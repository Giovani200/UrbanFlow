import { z as zod } from "zod";
import { CoordinatesSchema, TripModeSchema } from "./trip-planning.dto";

export const TripHistoryPeriodSchema = zod.enum(["week", "month", "all"]);
export type TripHistoryPeriod = zod.output<typeof TripHistoryPeriodSchema>;

export const ListTripsDtoInSchema = zod.object({
    period: TripHistoryPeriodSchema.default("all"),
    page: zod.coerce.number().int().min(1).default(1),
    pageSize: zod.coerce.number().int().min(1).max(50).default(10),
});
export type ListTripsDtoIn = zod.output<typeof ListTripsDtoInSchema>;

export const TripHistoryItemSchema = zod.object({
    id: zod.string(),
    takenAt: zod.string(),
    originLabel: zod.string(),
    destinationLabel: zod.string(),
    origin: CoordinatesSchema,
    destination: CoordinatesSchema,
    modes: zod.array(TripModeSchema),
    durationSeconds: zod.number(),
    distanceMeters: zod.number(),
    carbonGrams: zod.number(),
    savedGrams: zod.number(),
});
export type TripHistoryItem = zod.output<typeof TripHistoryItemSchema>;

export const ListTripsDtoOutSchema = zod.object({
    items: zod.array(TripHistoryItemSchema),
    total: zod.number(),
    page: zod.number(),
    pageSize: zod.number(),
    totalSavedGrams: zod.number(),
    totalDurationSeconds: zod.number(),
});
export type ListTripsDtoOut = zod.output<typeof ListTripsDtoOutSchema>;