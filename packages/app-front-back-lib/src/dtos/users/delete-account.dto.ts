import { z as zod } from "zod";

export const DeleteAccountDtoOutSchema = zod.object({ success: zod.literal(true) });
export type DeleteAccountDtoOut = zod.output<typeof DeleteAccountDtoOutSchema>;