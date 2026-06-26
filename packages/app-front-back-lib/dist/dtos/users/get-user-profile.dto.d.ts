import { z as zod } from "zod";
export declare const GetUserProfileDtoInSchema: zod.ZodObject<{}, zod.core.$strip>;
export type GetUserProfileDtoIn = zod.output<typeof GetUserProfileDtoInSchema>;
export declare const GetUserProfileDtoOutSchema: zod.ZodObject<{
    id: zod.ZodString;
    email: zod.ZodString;
    name: zod.ZodNullable<zod.ZodString>;
    mobilityProfile: zod.ZodNullable<zod.ZodObject<{
        weightCarbon: zod.ZodNumber;
        weightTime: zod.ZodNumber;
        weightCost: zod.ZodNumber;
        wheelchairAccess: zod.ZodBoolean;
        avoidStairs: zod.ZodBoolean;
        preferredModes: zod.ZodArray<zod.ZodString>;
    }, zod.core.$strip>>;
}, zod.core.$strip>;
export type GetUserProfileDtoOut = zod.output<typeof GetUserProfileDtoOutSchema>;
