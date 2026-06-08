import { z } from "zod";
import type { Stop } from "../types";

export const FetchStopsDtoInSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius: z.number().min(100).max(2000).default(500),
  wheelchairOnly: z.boolean().default(false),
});

export type FetchStopsDtoIn = z.output<typeof FetchStopsDtoInSchema>;

export type FetchStopsDtoOut = { stops: Stop[] };
