import { z as zod } from "zod";

export const CreateUserDtoInSchema = zod.object({
    email: zod.email(),
    name: zod.string().min(2).max(100).nullable(),
    password: zod.string().min(8).max(100),
    acceptedTerms: zod.literal(true),
});

export type CreateUserDtoIn = zod.output<typeof CreateUserDtoInSchema>;

export const CreateUserDtoOutSchema = zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string().nullable(),
});

export type CreateUserDtoOut = zod.output<typeof CreateUserDtoOutSchema>;
