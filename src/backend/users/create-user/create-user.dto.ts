import { z } from "zod";

export const CreateUserDtoInSchema = z.object({
    email: z.email(),
    name: z.string().min(2).max(100).nullable(),
    password: z.string().min(8).max(100),
});

export type CreateUserDtoIn = z.output<typeof CreateUserDtoInSchema>;

export const CreateUserDtoOutSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
});

export type CreateUserDtoOut = z.output<typeof CreateUserDtoOutSchema>;