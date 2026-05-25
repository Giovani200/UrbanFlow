import { z } from "zod";

export const GetUserProfileDtoInSchema = z.object({});
export type GetUserProfileDtoIn = z.output<typeof GetUserProfileDtoInSchema>;

export const GetUserProfileDtoOutSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    mobilityProfile: z
        .object({
            weightCarbon: z.number(),
            weightTime: z.number(),
            weightCost: z.number(),
            wheelchairAccess: z.boolean(),
            avoidStairs: z.boolean(),
            preferredModes: z.array(z.string()),
        })
        .nullable(),
});

export type GetUserProfileDtoOut = z.output<typeof GetUserProfileDtoOutSchema>;