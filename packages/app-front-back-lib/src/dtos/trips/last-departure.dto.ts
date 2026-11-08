import { z as zod } from "zod";
import { LabeledCoordinatesSchema } from "./record-trip.dto";
import { CoordinatesSchema, TransitStatusSchema, TripRouteSchema } from "./trip-planning.dto";

export const LastDepartureDtoInSchema = zod.object({
    position: CoordinatesSchema,
});
export type LastDepartureDtoIn = zod.output<typeof LastDepartureDtoInSchema>;

/**
 * `ok`, `no_result` et `unavailable` s'affichent ; les autres statuts imposent le silence :
 * pas de domicile, déjà près de chez soi, dernier départ trop lointain ou déjà passé.
 */
export const LastDepartureStatusSchema = zod.enum([
    "ok",
    "no_home",
    "near_home",
    "outside_window",
    "departed",
    "no_result",
    "unavailable",
]);
export type LastDepartureStatus = zod.output<typeof LastDepartureStatusSchema>;

export const LastDepartureDtoOutSchema = zod.object({
    status: LastDepartureStatusSchema,
    /** Le domicile, pour que le client enregistre le trajet fait. `null` sans domicile (`no_home`). */
    home: LabeledCoordinatesSchema.nullable(),
    lastDeparture: TripRouteSchema.nullable(),
    planB: TripRouteSchema.nullable(),
    /** Distingue « pas de Plan B » (`no_result`) d'une source en panne (`unavailable`). `null` hors statut `ok`. */
    planBStatus: TransitStatusSchema.nullable(),
});
export type LastDepartureDtoOut = zod.output<typeof LastDepartureDtoOutSchema>;
