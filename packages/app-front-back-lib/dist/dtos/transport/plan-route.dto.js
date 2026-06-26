"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanRouteDtoOutSchema = exports.PlanRouteDtoInSchema = exports.RouteSchema = exports.SegmentSchema = exports.GeoJsonLineStringSchema = exports.RoutingModeSchema = void 0;
const zod_1 = require("zod");
exports.RoutingModeSchema = zod_1.z.enum(["walk", "bike", "tram", "bus", "carpool"]);
exports.GeoJsonLineStringSchema = zod_1.z.object({
    type: zod_1.z.literal("LineString"),
    coordinates: zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()])),
});
exports.SegmentSchema = zod_1.z.object({
    mode: exports.RoutingModeSchema,
    geometry: exports.GeoJsonLineStringSchema,
    durationSeconds: zod_1.z.number(),
    distanceMeters: zod_1.z.number(),
    carbonGrams: zod_1.z.number(),
    stopFrom: zod_1.z.string().optional(),
    stopTo: zod_1.z.string().optional(),
    routeShortName: zod_1.z.string().optional(),
});
exports.RouteSchema = zod_1.z.object({
    segments: zod_1.z.array(exports.SegmentSchema),
    totalDuration: zod_1.z.number(),
    totalDistance: zod_1.z.number(),
    totalCarbon: zod_1.z.number(),
    score: zod_1.z.number(),
});
exports.PlanRouteDtoInSchema = zod_1.z.object({
    originLat: zod_1.z.number(),
    originLng: zod_1.z.number(),
    destLat: zod_1.z.number(),
    destLng: zod_1.z.number(),
    profile: zod_1.z
        .object({
        weightCarbon: zod_1.z.number().min(0).max(100),
        weightTime: zod_1.z.number().min(0).max(100),
        weightCost: zod_1.z.number().min(0).max(100),
        wheelchairAccess: zod_1.z.boolean(),
    })
        .optional(),
});
exports.PlanRouteDtoOutSchema = zod_1.z.object({
    routes: zod_1.z.array(exports.RouteSchema),
});
