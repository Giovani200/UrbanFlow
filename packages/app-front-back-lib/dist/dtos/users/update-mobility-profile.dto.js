"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMobilityProfileDtoOutSchema = exports.UpdateMobilityProfileDtoInSchema = void 0;
const zod_1 = require("zod");
const TransportModeSchema = zod_1.z.enum([
    "bike",
    "scooter",
    "tram",
    "bus",
    "carpool",
    "walk",
]);
exports.UpdateMobilityProfileDtoInSchema = zod_1.z.object({
    weightCarbon: zod_1.z.number().int().min(0).max(100).optional(),
    weightTime: zod_1.z.number().int().min(0).max(100).optional(),
    weightCost: zod_1.z.number().int().min(0).max(100).optional(),
    wheelchairAccess: zod_1.z.boolean().optional(),
    avoidStairs: zod_1.z.boolean().optional(),
    preferredModes: zod_1.z.array(TransportModeSchema).optional(),
});
exports.UpdateMobilityProfileDtoOutSchema = zod_1.z.object({
    weightCarbon: zod_1.z.number(),
    weightTime: zod_1.z.number(),
    weightCost: zod_1.z.number(),
    wheelchairAccess: zod_1.z.boolean(),
    avoidStairs: zod_1.z.boolean(),
    preferredModes: zod_1.z.array(zod_1.z.string()),
});
