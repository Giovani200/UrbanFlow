import { z as zod } from "zod";

export const LoginDtoInSchema = zod.object({
    email: zod.email(),
    password: zod.string().min(1),
});
export type LoginDtoIn = zod.output<typeof LoginDtoInSchema>;

export const LoginDtoOutSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
});
export type LoginDtoOut = zod.output<typeof LoginDtoOutSchema>;
