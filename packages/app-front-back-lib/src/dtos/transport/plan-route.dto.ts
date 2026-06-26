import { z as zod } from "zod";

export const RoutingModeSchema = zod.enum(["walk", "bike", "tram", "bus", "carpool"]);
export type RoutingMode = zod.output<typeof RoutingModeSchema>;

export const GeoJsonLineStringSchema = zod.object({
    type: zod.literal("LineString"),
    coordinates: zod.array(zod.tuple([zod.number(), zod.number()])),
});
export type GeoJsonLineString = zod.output<typeof GeoJsonLineStringSchema>;

export const SegmentSchema = zod.object({
    mode: RoutingModeSchema,
    geometry: GeoJsonLineStringSchema,
    durationSeconds: zod.number(),
    distanceMeters: zod.number(),
    carbonGrams: zod.number(),
    stopFrom: zod.string().optional(),
    stopTo: zod.string().optional(),
    routeShortName: zod.string().optional(),
});
export type Segment = zod.output<typeof SegmentSchema>;

export const RouteSchema = zod.object({
    segments: zod.array(SegmentSchema),
    totalDuration: zod.number(),
    totalDistance: zod.number(),
    totalCarbon: zod.number(),
    score: zod.number(),
});
export type Route = zod.output<typeof RouteSchema>;

export const PlanRouteDtoInSchema = zod.object({
    originLat: zod.number(),
    originLng: zod.number(),
    destLat: zod.number(),
    destLng: zod.number(),
    profile: zod
        .object({
            weightCarbon: zod.number().min(0).max(100),
            weightTime: zod.number().min(0).max(100),
            weightCost: zod.number().min(0).max(100),
            wheelchairAccess: zod.boolean(),
        })
        .optional(),
});
export type PlanRouteDtoIn = zod.output<typeof PlanRouteDtoInSchema>;

export const PlanRouteDtoOutSchema = zod.object({
    routes: zod.array(RouteSchema),
});
export type PlanRouteDtoOut = zod.output<typeof PlanRouteDtoOutSchema>;
