import { z as zod } from "zod";

export const ExportUserDataDtoOutSchema = zod.object({
    exportedAt: zod.string(),
    account: zod.object({
        email: zod.string(),
        name: zod.string().nullable(),
    }),
    preferences: zod
        .object({
            weightCarbon: zod.number(),
            weightTime: zod.number(),
            weightCost: zod.number(),
            wheelchairAccess: zod.boolean(),
            avoidStairs: zod.boolean(),
            preferredModes: zod.array(zod.string()),
            monthlyGoalKg: zod.number().nullable(),
        })
        .nullable(),
    favoriteAddresses: zod.array(
        zod.object({
            label: zod.string(),
            address: zod.string(),
            latitude: zod.number(),
            longitude: zod.number(),
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
});
export type ExportUserDataDtoOut = zod.output<typeof ExportUserDataDtoOutSchema>;