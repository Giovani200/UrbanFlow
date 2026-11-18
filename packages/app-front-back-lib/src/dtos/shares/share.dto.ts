import { z as zod } from "zod";
import { ConnectionVerdictSchema } from "../routines/routine-today.dto";
import { CoordinatesSchema, DataFreshnessSchema, TripRouteSchema } from "../trips/trip-planning.dto";

export const CreateShareDtoInSchema = zod.object({
    source: zod.discriminatedUnion("kind", [
        zod.object({ kind: zod.literal("routine"), routineId: zod.string().min(1) }),
        zod.object({
            kind: zod.literal("itinerary"),
            itinerary: TripRouteSchema,
            destinationLabel: zod.string().trim().min(1).max(80),
        }),
    ]),
});
export type CreateShareDtoIn = zod.output<typeof CreateShareDtoInSchema>;

/** Le jeton en clair n'est renvoyé qu'une fois, à la création : le serveur n'en garde que l'empreinte. */
export const CreateShareDtoOutSchema = zod.object({
    token: zod.string(),
});
export type CreateShareDtoOut = zod.output<typeof CreateShareDtoOutSchema>;

export const SharePositionDtoInSchema = CoordinatesSchema;
export type SharePositionDtoIn = zod.output<typeof SharePositionDtoInSchema>;

/** Enveloppé dans un objet : Nest répond par un corps vide, illisible en JSON, quand un contrôleur renvoie `null`. */
export const CurrentShareDtoOutSchema = zod.object({
    share: zod
        .object({
            startedAt: zod.string(),
            destinationLabel: zod.string(),
            routineId: zod.string().nullable(),
        })
        .nullable(),
});
export type CurrentShareDtoOut = zod.output<typeof CurrentShareDtoOutSchema>;

export const ShareStateSchema = zod.enum(["in_progress", "arrival_unconfirmed", "arrived", "stopped", "expired"]);
export type ShareState = zod.output<typeof ShareStateSchema>;

/** `confirmed` : observé (GPS du téléphone, geste de la personne). `planned` : déduit de l'itinéraire et du temps réel. */
export const ShareInformationLevelSchema = zod.enum(["confirmed", "planned"]);
export type ShareInformationLevel = zod.output<typeof ShareInformationLevelSchema>;

const ShareStepBaseSchema = zod.object({
    stopName: zod.string(),
    time: zod.string().nullable(),
    freshness: DataFreshnessSchema.nullable(),
    level: ShareInformationLevelSchema,
});

export const ShareStepSchema = zod.discriminatedUnion("kind", [
    ShareStepBaseSchema.extend({
        kind: zod.literal("board"),
        lineShortName: zod.string().nullable(),
        lineId: zod.string().nullable(),
        lineColor: zod.string().nullable(),
        lineTextColor: zod.string().nullable(),
    }),
    ShareStepBaseSchema.extend({ kind: zod.literal("connection"), verdict: ConnectionVerdictSchema }),
    ShareStepBaseSchema.extend({ kind: zod.literal("arrive") }),
]);
export type ShareStep = zod.output<typeof ShareStepSchema>;

/** Dernière position GPS, rattachée à l'arrêt de l'itinéraire le plus proche. Jamais de coordonnées. */
export const ShareLastPositionSchema = zod.object({
    at: zod.string(),
    nearStopName: zod.string().nullable(),
    outsideItinerary: zod.boolean(),
});
export type ShareLastPosition = zod.output<typeof ShareLastPositionSchema>;

/**
 * Vue publique d'un partage, pour le proche. Une fois le partage terminé, seuls `state`, `endedAt` et le prénom
 * restent : l'itinéraire et la position sont supprimés, donc les autres champs sont vides.
 */
export const ShareViewDtoOutSchema = zod.object({
    sharerFirstName: zod.string().nullable(),
    state: ShareStateSchema,
    endedAt: zod.string().nullable(),
    destinationLabel: zod.string().nullable(),
    estimatedArrival: zod.object({ time: zod.string(), freshness: DataFreshnessSchema }).nullable(),
    steps: zod.array(ShareStepSchema),
    /** L'étape en cours d'après le niveau d'information le plus fort disponible, `null` hors trajet. */
    currentStepIndex: zod.number().int().min(0).nullable(),
    lastPosition: ShareLastPositionSchema.nullable(),
});
export type ShareViewDtoOut = zod.output<typeof ShareViewDtoOutSchema>;
