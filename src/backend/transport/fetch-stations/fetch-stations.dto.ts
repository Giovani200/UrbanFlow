import { z } from "zod";
import type { BikeStation } from "../types";

export const FetchStationsDtoOutSchema = z.object({
  stations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      bikesAvailable: z.number(),
      docksAvailable: z.number(),
      isRenting: z.boolean(),
      isReturning: z.boolean(),
    })
  ),
});

export type FetchStationsDtoOut = { stations: BikeStation[] };
