import { z as zod } from "zod";
export declare const UpdateMobilityProfileDtoInSchema: zod.ZodObject<{
    weightCarbon: zod.ZodOptional<zod.ZodNumber>;
    weightTime: zod.ZodOptional<zod.ZodNumber>;
    weightCost: zod.ZodOptional<zod.ZodNumber>;
    wheelchairAccess: zod.ZodOptional<zod.ZodBoolean>;
    avoidStairs: zod.ZodOptional<zod.ZodBoolean>;
    preferredModes: zod.ZodOptional<zod.ZodArray<zod.ZodEnum<{
        bike: "bike";
        scooter: "scooter";
        tram: "tram";
        bus: "bus";
        carpool: "carpool";
        walk: "walk";
    }>>>;
}, zod.core.$strip>;
export type UpdateMobilityProfileDtoIn = zod.output<typeof UpdateMobilityProfileDtoInSchema>;
export declare const UpdateMobilityProfileDtoOutSchema: zod.ZodObject<{
    weightCarbon: zod.ZodNumber;
    weightTime: zod.ZodNumber;
    weightCost: zod.ZodNumber;
    wheelchairAccess: zod.ZodBoolean;
    avoidStairs: zod.ZodBoolean;
    preferredModes: zod.ZodArray<zod.ZodString>;
}, zod.core.$strip>;
export type UpdateMobilityProfileDtoOut = zod.output<typeof UpdateMobilityProfileDtoOutSchema>;
