import { z as zod } from "zod";
import { LabeledCoordinatesSchema } from "../trips/record-trip.dto";
import { StoredPreferencesSchema } from "./update-preferences.dto";

export const ExportUserDataDtoOutSchema = zod.object({
    exportedAt: zod.string(),
    account: zod.object({
        email: zod.string(),
        name: zod.string().nullable(),
    }),
    preferences: StoredPreferencesSchema.nullable(),
    favoriteAddresses: zod.array(
        zod.object({
            label: zod.string(),
            address: zod.string(),
            latitude: zod.number(),
            longitude: zod.number(),
            isHome: zod.boolean(),
            createdAt: zod.string(),
        }),
    ),
    trips: zod.array(
        zod.object({
            originLabel: zod.string(),
            destinationLabel: zod.string(),
            modes: zod.array(zod.string()),
            durationSeconds: zod.number(),
            distanceMeters: zod.number(),
            carbonGrams: zod.number(),
            createdAt: zod.string(),
        }),
    ),
    carbonEntries: zod.array(
        zod.object({
            mode: zod.string(),
            distanceKm: zod.number(),
            carbonGrams: zod.number(),
            savedVsCar: zod.number(),
            createdAt: zod.string(),
        }),
    ),
    routines: zod.array(
        zod.object({
            name: zod.string(),
            origin: LabeledCoordinatesSchema,
            destination: LabeledCoordinatesSchema,
            arrivalTime: zod.string(),
            usualDepartureTime: zod.string(),
            weekdays: zod.array(zod.number()),
            lineIds: zod.array(zod.string()),
            createdAt: zod.string(),
            dayPlan: zod
                .object({
                    serviceDay: zod.string(),
                    planOrigin: zod.string(),
                    itinerary: zod.unknown(),
                    updatedAt: zod.string(),
                })
                .nullable(),
        }),
    ),
});
export type ExportUserDataDtoOut = zod.output<typeof ExportUserDataDtoOutSchema>;