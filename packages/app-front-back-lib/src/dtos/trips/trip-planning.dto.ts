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

export const TripSegmentSchema = zod.object({
    mode: TripModeSchema,
    geometry: GeoJsonLineStringSchema,
    durationSeconds: zod.number(),
    distanceMeters: zod.number(),
    carbonGrams: zod.number(),
    departureStopName: zod.string().optional(),
    arrivalStopName: zod.string().optional(),
    lineShortName: zod.string().optional(),
});
export type TripSegment = zod.output<typeof TripSegmentSchema>;

export const TripRouteSchema = zod.object({
    segments: zod.array(TripSegmentSchema),
    totalDurationSeconds: zod.number(),
    totalDistanceMeters: zod.number(),
    totalCarbonGrams: zod.number(),
    score: zod.number(),
});
export type TripRoute = zod.output<typeof TripRouteSchema>;

export const RoutingProfileSchema = zod.object({
    weightCarbon: zod.number().min(0).max(100),
    weightTime: zod.number().min(0).max(100),
    weightCost: zod.number().min(0).max(100),
    wheelchairAccess: zod.boolean(),
});
export type RoutingProfile = zod.output<typeof RoutingProfileSchema>;

export const TripPlanningDtoInSchema = zod.object({
    origin: CoordinatesSchema,
    destination: CoordinatesSchema,
    profile: RoutingProfileSchema.optional(),
});
export type TripPlanningDtoIn = zod.output<typeof TripPlanningDtoInSchema>;

export const TripPlanningDtoOutSchema = zod.object({
    walk: TripRouteSchema.nullable(),
    bike: TripRouteSchema.nullable(),
    transit: zod.array(TripRouteSchema),
});
export type TripPlanningDtoOut = zod.output<typeof TripPlanningDtoOutSchema>;