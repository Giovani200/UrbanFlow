import { z as zod } from "zod";
import { CoordinatesSchema } from "../trips/trip-planning.dto";

export const TransitStopModeSchema = zod.enum(["tram", "bus", "metro", "rer", "train", "ter"]);
export type TransitStopMode = zod.output<typeof TransitStopModeSchema>;

export const TransitLineSchema = zod.object({
    /** Identifiant IDFM de la ligne (`C00881`), qui relie une plaque aux passages SIRI. */
    lineId: zod.string().optional(),
    code: zod.string(),
    mode: TransitStopModeSchema,
    color: zod.string().optional(),
    textColor: zod.string().optional(),
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

export const SharedVehicleTypeSchema = zod.enum(["bike", "scooter"]);
export type SharedVehicleType = zod.output<typeof SharedVehicleTypeSchema>;

export const SharedVehicleSchema = zod.object({
    id: zod.string(),
    type: SharedVehicleTypeSchema,
    location: CoordinatesSchema,
    distanceMeters: zod.number(),
});
export type SharedVehicle = zod.output<typeof SharedVehicleSchema>;

export const NearbyTransportDtoInSchema = zod.object({
    latitude: zod.coerce.number().min(-90).max(90),
    longitude: zod.coerce.number().min(-180).max(180),
    radiusMeters: zod.coerce.number().int().positive().max(2000).default(400),
});
export type NearbyTransportDtoIn = zod.output<typeof NearbyTransportDtoInSchema>;

export const NearbyTransportDtoOutSchema = zod.object({
    /** Tous les arrêts proches, pour la carte. */
    transitStops: zod.array(TransitStopSchema),
    /** Ceux à lister, du plus proche au plus loin : chaque ligne et chaque sens y apparaissent une seule fois. */
    listedStopIds: zod.array(zod.string()),
    sharedVehicles: zod.array(SharedVehicleSchema),
});
export type NearbyTransportDtoOut = zod.output<typeof NearbyTransportDtoOutSchema>;
