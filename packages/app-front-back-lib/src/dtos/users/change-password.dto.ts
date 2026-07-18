import { z as zod } from "zod";

export const ChangePasswordDtoInSchema = zod.object({
    currentPassword: zod.string().min(1),
    newPassword: zod.string().min(8).max(100),
});
export type ChangePasswordDtoIn = zod.output<typeof ChangePasswordDtoInSchema>;

export const ChangePasswordDtoOutSchema = zod.object({ success: zod.literal(true) });
export type ChangePasswordDtoOut = zod.output<typeof ChangePasswordDtoOutSchema>;