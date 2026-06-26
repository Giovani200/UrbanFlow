import { z as zod } from "zod";
export declare const RoutingModeSchema: zod.ZodEnum<{
    walk: "walk";
    bike: "bike";
    tram: "tram";
    bus: "bus";
    carpool: "carpool";
}>;
export type RoutingMode = zod.output<typeof RoutingModeSchema>;
export declare const GeoJsonLineStringSchema: zod.ZodObject<{
    type: zod.ZodLiteral<"LineString">;
    coordinates: zod.ZodArray<zod.ZodTuple<[zod.ZodNumber, zod.ZodNumber], null>>;
}, zod.core.$strip>;
export type GeoJsonLineString = zod.output<typeof GeoJsonLineStringSchema>;
export declare const SegmentSchema: zod.ZodObject<{
    mode: zod.ZodEnum<{
        walk: "walk";
        bike: "bike";
        tram: "tram";
        bus: "bus";
        carpool: "carpool";
    }>;
    geometry: zod.ZodObject<{
        type: zod.ZodLiteral<"LineString">;
        coordinates: zod.ZodArray<zod.ZodTuple<[zod.ZodNumber, zod.ZodNumber], null>>;
    }, zod.core.$strip>;
    durationSeconds: zod.ZodNumber;
    distanceMeters: zod.ZodNumber;
    carbonGrams: zod.ZodNumber;
    stopFrom: zod.ZodOptional<zod.ZodString>;
    stopTo: zod.ZodOptional<zod.ZodString>;
    routeShortName: zod.ZodOptional<zod.ZodString>;
}, zod.core.$strip>;
export type Segment = zod.output<typeof SegmentSchema>;
export declare const RouteSchema: zod.ZodObject<{
    segments: zod.ZodArray<zod.ZodObject<{
        mode: zod.ZodEnum<{
            walk: "walk";
            bike: "bike";
            tram: "tram";
            bus: "bus";
            carpool: "carpool";
        }>;
        geometry: zod.ZodObject<{
            type: zod.ZodLiteral<"LineString">;
            coordinates: zod.ZodArray<zod.ZodTuple<[zod.ZodNumber, zod.ZodNumber], null>>;
        }, zod.core.$strip>;
        durationSeconds: zod.ZodNumber;
        distanceMeters: zod.ZodNumber;
        carbonGrams: zod.ZodNumber;
        stopFrom: zod.ZodOptional<zod.ZodString>;
        stopTo: zod.ZodOptional<zod.ZodString>;
        routeShortName: zod.ZodOptional<zod.ZodString>;
    }, zod.core.$strip>>;
    totalDuration: zod.ZodNumber;
    totalDistance: zod.ZodNumber;
    totalCarbon: zod.ZodNumber;
    score: zod.ZodNumber;
}, zod.core.$strip>;
export type Route = zod.output<typeof RouteSchema>;
export declare const PlanRouteDtoInSchema: zod.ZodObject<{
    originLat: zod.ZodNumber;
    originLng: zod.ZodNumber;
    destLat: zod.ZodNumber;
    destLng: zod.ZodNumber;
    profile: zod.ZodOptional<zod.ZodObject<{
        weightCarbon: zod.ZodNumber;
        weightTime: zod.ZodNumber;
        weightCost: zod.ZodNumber;
        wheelchairAccess: zod.ZodBoolean;
    }, zod.core.$strip>>;
}, zod.core.$strip>;
export type PlanRouteDtoIn = zod.output<typeof PlanRouteDtoInSchema>;
export declare const PlanRouteDtoOutSchema: zod.ZodObject<{
    routes: zod.ZodArray<zod.ZodObject<{
        segments: zod.ZodArray<zod.ZodObject<{
            mode: zod.ZodEnum<{
                walk: "walk";
                bike: "bike";
                tram: "tram";
                bus: "bus";
                carpool: "carpool";
            }>;
            geometry: zod.ZodObject<{
                type: zod.ZodLiteral<"LineString">;
                coordinates: zod.ZodArray<zod.ZodTuple<[zod.ZodNumber, zod.ZodNumber], null>>;
            }, zod.core.$strip>;
            durationSeconds: zod.ZodNumber;
            distanceMeters: zod.ZodNumber;
            carbonGrams: zod.ZodNumber;
            stopFrom: zod.ZodOptional<zod.ZodString>;
            stopTo: zod.ZodOptional<zod.ZodString>;
            routeShortName: zod.ZodOptional<zod.ZodString>;
        }, zod.core.$strip>>;
        totalDuration: zod.ZodNumber;
        totalDistance: zod.ZodNumber;
        totalCarbon: zod.ZodNumber;
        score: zod.ZodNumber;
    }, zod.core.$strip>>;
}, zod.core.$strip>;
export type PlanRouteDtoOut = zod.output<typeof PlanRouteDtoOutSchema>;
