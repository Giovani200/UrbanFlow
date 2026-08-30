import { z as zod } from "zod";

export const TripModeSchema = zod.enum(["walk", "bike", "scooter", "tram", "bus", "carpool", "car"]);
export type TripMode = zod.output<typeof TripModeSchema>;

export const CoordinatesSchema = zod.object({
    latitude: zod.number().min(-90).max(90),
    longitude: zod.number().min(-180).max(180),
});
export type Coordinates = zod.output<typeof CoordinatesSchema>;

export const GeoJsonLineStringSchema = zod.object({
    type: zod.literal("LineString"),
    coordinates: zod.array(zod.tuple([zod.number(), zod.number()])),
});
export type GeoJsonLineString = zod.output<typeof GeoJsonLineStringSchema>;

export const TransitStopPointSchema = zod.object({
    name: zod.string(),
    latitude: zod.number(),
    longitude: zod.number(),
});
export type TransitStopPoint = zod.output<typeof TransitStopPointSchema>;

export const TripSegmentSchema = zod.object({
    mode: TripModeSchema,
    geometry: GeoJsonLineStringSchema,
    durationSeconds: zod.number(),
    distanceMeters: zod.number(),
    carbonGrams: zod.number(),
    savedGrams: zod.number(),
    departureStopName: zod.string().optional(),
    arrivalStopName: zod.string().optional(),
    lineShortName: zod.string().optional(),
    intermediateStops: zod.array(TransitStopPointSchema).optional(),
});
export type TripSegment = zod.output<typeof TripSegmentSchema>;

export const TripRouteSchema = zod.object({
    segments: zod.array(TripSegmentSchema),
    totalDurationSeconds: zod.number(),
    totalDistanceMeters: zod.number(),
    totalCarbonGrams: zod.number(),
    totalSavedGrams: zod.number(),
    score: zod.number(),
});
export type TripRoute = zod.output<typeof TripRouteSchema>;

export const RoutingProfileSchema = zod.object({
    weightCarbon: zod.number().min(0).max(100),
    weightTime: zod.number().min(0).max(100),
    wheelchairAccess: zod.boolean(),
    preferredModes: zod.array(TripModeSchema).optional(),
});
export type RoutingProfile = zod.output<typeof RoutingProfileSchema>;

export const PlannedTimeSchema = zod.object({
    // Heure locale Grenoble (Europe/Paris), wall-clock sans offset UTC.
    dateTime: zod.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    mode: zod.enum(["departure", "arrival"]),
});
export type PlannedTime = zod.output<typeof PlannedTimeSchema>;

export const TripPlanningDtoInSchema = zod.object({
    origin: CoordinatesSchema,
    destination: CoordinatesSchema,
    profile: RoutingProfileSchema.optional(),
    plannedTime: PlannedTimeSchema.optional(),
});
export type TripPlanningDtoIn = zod.output<typeof TripPlanningDtoInSchema>;

export const TripPlanningDtoOutSchema = zod.object({
    walk: TripRouteSchema.nullable(),
    bike: TripRouteSchema.nullable(),
    transit: zod.array(TripRouteSchema),
});
export type TripPlanningDtoOut = zod.output<typeof TripPlanningDtoOutSchema>;