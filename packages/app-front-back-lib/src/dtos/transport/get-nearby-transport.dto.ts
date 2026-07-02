import { z as zod } from "zod";
import { CoordinatesSchema } from "../trips/trip-planning.dto";

export const TransitStopModeSchema = zod.enum(["tram", "bus"]);
export type TransitStopMode = zod.output<typeof TransitStopModeSchema>;

export const TransitLineSchema = zod.object({
    code: zod.string(),
    mode: TransitStopModeSchema,
});
export type TransitLine = zod.output<typeof TransitLineSchema>;

export const TransitStopSchema = zod.object({
    id: zod.string(),
    name: zod.string(),
    location: CoordinatesSchema,
    distanceMeters: zod.number(),
    lines: zod.array(TransitLineSchema),
});
export type TransitStop = zod.output<typeof TransitStopSchema>;

export const NearbyTransportDtoInSchema = zod.object({
    latitude: zod.coerce.number().min(-90).max(90),
    longitude: zod.coerce.number().min(-180).max(180),
    radiusMeters: zod.coerce.number().int().positive().max(2000).default(400),
});
export type NearbyTransportDtoIn = zod.output<typeof NearbyTransportDtoInSchema>;

export const NearbyTransportDtoOutSchema = zod.object({
    transitStops: zod.array(TransitStopSchema),
});
export type NearbyTransportDtoOut = zod.output<typeof NearbyTransportDtoOutSchema>;
