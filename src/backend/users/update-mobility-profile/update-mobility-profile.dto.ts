import { z } from "zod";

const TransportModeSchema = z.enum([
    "bike",
    "scooter",
    "tram",
    "bus",
    "carpool",
    "walk",
]);

export const UpdateMobilityProfileDtoInSchema = z.object({
    weightCarbon: z.number().int().min(0).max(100).optional(),
    weightTime: z.number().int().min(0).max(100).optional(),
    weightCost: z.number().int().min(0).max(100).optional(),
    wheelchairAccess: z.boolean().optional(),
    avoidStairs: z.boolean().optional(),
    preferredModes: z.array(TransportModeSchema).optional(),
});

export type UpdateMobilityProfileDtoIn = z.output<typeof UpdateMobilityProfileDtoInSchema>;

export const UpdateMobilityProfileDtoOutSchema = z.object({
    weightCarbon: z.number(),
    weightTime: z.number(),
    weightCost: z.number(),
    wheelchairAccess: z.boolean(),
    avoidStairs: z.boolean(),
    preferredModes: z.array(z.string()),
});

export type UpdateMobilityProfileDtoOut = z.output<typeof UpdateMobilityProfileDtoOutSchema>;
