import { z as zod } from "zod";

const TransportModeSchema = zod.enum([
    "bike",
    "scooter",
    "tram",
    "bus",
    "carpool",
    "walk",
]);

export const UpdatePreferencesDtoInSchema = zod.object({
    weightCarbon: zod.number().int().min(0).max(100).optional(),
    weightTime: zod.number().int().min(0).max(100).optional(),
    weightCost: zod.number().int().min(0).max(100).optional(),
    wheelchairAccess: zod.boolean().optional(),
    avoidStairs: zod.boolean().optional(),
    preferredModes: zod.array(TransportModeSchema).optional(),
});

export type UpdatePreferencesDtoIn = zod.output<typeof UpdatePreferencesDtoInSchema>;

export const UpdatePreferencesDtoOutSchema = zod.object({
    weightCarbon: zod.number(),
    weightTime: zod.number(),
    weightCost: zod.number(),
    wheelchairAccess: zod.boolean(),
    avoidStairs: zod.boolean(),
    preferredModes: zod.array(zod.string()),
});

export type UpdatePreferencesDtoOut = zod.output<typeof UpdatePreferencesDtoOutSchema>;
