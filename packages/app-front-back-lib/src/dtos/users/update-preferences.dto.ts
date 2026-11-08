import { z as zod } from "zod";

const TransportModeSchema = zod.enum([
    "bike",
    "scooter",
    "tram",
    "bus",
    "walk",
    "metro",
    "rer",
    "train",
]);

/** Bornes et valeurs par défaut des réglages du dernier départ, communes au front et à l'API. */
export const LAST_DEPARTURE_SETTINGS = {
    distanceMeters: { min: 500, max: 20_000, step: 500, default: 1000 },
    windowMinutes: { min: 30, max: 360, step: 30, default: 120 },
} as const;

export const UpdatePreferencesDtoInSchema = zod.object({
    weightCarbon: zod.number().int().min(0).max(100).optional(),
    weightTime: zod.number().int().min(0).max(100).optional(),
    weightCost: zod.number().int().min(0).max(100).optional(),
    wheelchairAccess: zod.boolean().optional(),
    avoidStairs: zod.boolean().optional(),
    preferredModes: zod.array(TransportModeSchema).optional(),
    monthlyGoalKg: zod.number().int().min(0).nullable().optional(),
    lastDepartureDistanceMeters: zod
        .number()
        .int()
        .min(LAST_DEPARTURE_SETTINGS.distanceMeters.min)
        .max(LAST_DEPARTURE_SETTINGS.distanceMeters.max)
        .optional(),
    lastDepartureWindowMinutes: zod
        .number()
        .int()
        .min(LAST_DEPARTURE_SETTINGS.windowMinutes.min)
        .max(LAST_DEPARTURE_SETTINGS.windowMinutes.max)
        .optional(),
});

export type UpdatePreferencesDtoIn = zod.output<typeof UpdatePreferencesDtoInSchema>;

/** Préférences enregistrées, telles que renvoyées par le profil, la mise à jour et l'export RGPD. */
export const StoredPreferencesSchema = zod.object({
    weightCarbon: zod.number(),
    weightTime: zod.number(),
    weightCost: zod.number(),
    wheelchairAccess: zod.boolean(),
    avoidStairs: zod.boolean(),
    preferredModes: zod.array(zod.string()),
    monthlyGoalKg: zod.number().nullable(),
    lastDepartureDistanceMeters: zod.number(),
    lastDepartureWindowMinutes: zod.number(),
});
export type StoredPreferences = zod.output<typeof StoredPreferencesSchema>;

export const UpdatePreferencesDtoOutSchema = StoredPreferencesSchema;

export type UpdatePreferencesDtoOut = zod.output<typeof UpdatePreferencesDtoOutSchema>;
