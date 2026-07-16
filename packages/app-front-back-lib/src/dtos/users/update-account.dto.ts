import { z as zod } from "zod";

export const UpdateAccountDtoInSchema = zod.object({
    name: zod.string().trim().min(2).max(100),
});
export type UpdateAccountDtoIn = zod.output<typeof UpdateAccountDtoInSchema>;

export const UpdateAccountDtoOutSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
});
export type UpdateAccountDtoOut = zod.output<typeof UpdateAccountDtoOutSchema>;