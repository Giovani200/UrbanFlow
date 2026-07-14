import { z as zod } from "zod";

export const GetUserProfileDtoInSchema = zod.object({});
export type GetUserProfileDtoIn = zod.output<typeof GetUserProfileDtoInSchema>;

export const GetUserProfileDtoOutSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
    preferences: zod
        .object({
            weightCarbon: zod.number(),
            weightTime: zod.number(),
            weightCost: zod.number(),
            wheelchairAccess: zod.boolean(),
            avoidStairs: zod.boolean(),
            preferredModes: zod.array(zod.string()),
            monthlyGoalKg: zod.number().nullable(),
        })
        .nullable(),
});

export type GetUserProfileDtoOut = zod.output<typeof GetUserProfileDtoOutSchema>;
