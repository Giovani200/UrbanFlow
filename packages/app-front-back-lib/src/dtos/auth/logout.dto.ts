import { z as zod } from "zod";

export const LogoutDtoOutSchema = zod.object({ success: zod.literal(true) });
export type LogoutDtoOut = zod.output<typeof LogoutDtoOutSchema>;
