import { z as zod } from "zod";
import { StoredPreferencesSchema } from "./update-preferences.dto";

export const GetUserProfileDtoInSchema = zod.object({});
export type GetUserProfileDtoIn = zod.output<typeof GetUserProfileDtoInSchema>;

export const GetUserProfileDtoOutSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
    hasPassword: zod.boolean(),
    preferences: StoredPreferencesSchema.nullable(),
});

export type GetUserProfileDtoOut = zod.output<typeof GetUserProfileDtoOutSchema>;
