import { z as zod } from "zod";
import { CoordinatesSchema, TripModeSchema, TripRouteSchema } from "./trip-planning.dto";

export const LabeledCoordinatesSchema = CoordinatesSchema.extend({
    label: zod.string(),
});
export type LabeledCoordinates = zod.output<typeof LabeledCoordinatesSchema>;

// Entrée de POST /trips : l'itinéraire réellement choisi et fait par l'utilisateur.
export const RecordTripDtoInSchema = zod.object({
    origin: LabeledCoordinatesSchema,
    destination: LabeledCoordinatesSchema,
    route: TripRouteSchema,
});
export type RecordTripDtoIn = zod.output<typeof RecordTripDtoInSchema>;

export const RecordTripDtoOutSchema = zod.object({
    tripId: zod.string(),
});
export type RecordTripDtoOut = zod.output<typeof RecordTripDtoOutSchema>;

// TripRecord : trajet stocké côté client (utilisateur anonyme, localStorage, plafonné).
export const TripRecordSegmentSchema = zod.object({
    mode: TripModeSchema,
    distanceMeters: zod.number().min(0),
    carbonGrams: zod.number(),
    savedGrams: zod.number(),
});
export type TripRecordSegment = zod.output<typeof TripRecordSegmentSchema>;

export const TripRecordSchema = zod.object({
    id: zod.string(),
    takenAt: zod.string(),
    originLabel: zod.string(),
    destinationLabel: zod.string(),
    segments: zod.array(TripRecordSegmentSchema),
    totalCarbonGrams: zod.number(),
    totalSavedGrams: zod.number(),
});
export type TripRecord = zod.output<typeof TripRecordSchema>;
