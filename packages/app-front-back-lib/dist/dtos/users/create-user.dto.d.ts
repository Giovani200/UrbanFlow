import { z as zod } from "zod";
export declare const CreateUserDtoInSchema: zod.ZodObject<{
    email: zod.ZodEmail;
    name: zod.ZodNullable<zod.ZodString>;
    password: zod.ZodString;
}, zod.core.$strip>;
export type CreateUserDtoIn = zod.output<typeof CreateUserDtoInSchema>;
export declare const CreateUserDtoOutSchema: zod.ZodObject<{
    id: zod.ZodString;
    email: zod.ZodString;
    name: zod.ZodNullable<zod.ZodString>;
}, zod.core.$strip>;
export type CreateUserDtoOut = zod.output<typeof CreateUserDtoOutSchema>;
