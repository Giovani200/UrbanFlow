import { z as zod } from "zod";
export declare const LoginDtoInSchema: zod.ZodObject<{
    email: zod.ZodEmail;
    password: zod.ZodString;
}, zod.core.$strip>;
export type LoginDtoIn = zod.output<typeof LoginDtoInSchema>;
export declare const LoginDtoOutSchema: zod.ZodObject<{
    id: zod.ZodString;
    email: zod.ZodString;
    name: zod.ZodNullable<zod.ZodString>;
}, zod.core.$strip>;
export type LoginDtoOut = zod.output<typeof LoginDtoOutSchema>;
