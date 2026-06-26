import { z } from "zod";

export const PlanRouteDtoInSchema = z.object({
  originLat: z.number(),
  originLng: z.number(),
  destLat: z.number(),
  destLng: z.number(),
  profile: z
    .object({
      weightCarbon: z.number().min(0).max(100),
      weightTime: z.number().min(0).max(100),
      weightCost: z.number().min(0).max(100),
      wheelchairAccess: z.boolean(),
    })
    .optional(),
});

export type PlanRouteDtoIn = z.output<typeof PlanRouteDtoInSchema>;
