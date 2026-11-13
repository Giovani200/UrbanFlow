import { describe, expect, it, vi } from "vitest";
import { ExportUserDataUseCase } from "./export-user-data.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

describe("ExportUserDataUseCase", () => {
    it("regroupe les données du user connecté, dates en ISO", async () => {
        const now = new Date("2026-07-18T10:00:00Z");
        const findUnique = vi.fn(async (_arg: { where: { id: string } }) => ({
            email: "user-1@test.fr",
            name: "Thomas",
            preferences: {
                wheelchairAccess: false,
                monthlyGoalKg: null,
                lastDepartureDistanceMeters: 1000,
                lastDepartureWindowMinutes: 120,
            },
            favoriteAddresses: [
                { label: "Domicile", address: "12 rue X", latitude: 45.18, longitude: 5.72, isHome: true, createdAt: now },
            ],
            trips: [
                {
                    originLabel: "A",
                    destLabel: "B",
                    modes: ["tram"],
                    durationSeconds: 600,
                    distanceMeters: 4000,
                    carbonGrams: 17.76,
                    createdAt: now,
                },
            ],
            carbonEntries: [
                { mode: "tram", distanceKm: 4, carbonGrams: 17.76, savedVsCar: 550.24, createdAt: now },
            ],
            routines: [
                {
                    name: "Travail",
                    originLabel: "Henri Wallon",
                    originLat: 48.5244,
                    originLng: 2.6437,
                    destLabel: "La Défense",
                    destLat: 48.892,
                    destLng: 2.238,
                    arrivalTime: "09:00",
                    usualDepartureTime: "07:41",
                    weekdays: [1, 2, 3, 4, 5],
                    lineIds: ["C00881", "C01731", "C01742"],
                    createdAt: now,
                    dayPlan: {
                        serviceDay: "2026-07-18",
                        planOrigin: "usual",
                        itinerary: { legs: [], durationSeconds: 3600 },
                        updatedAt: now,
                    },
                },
            ],
        }));
        const prisma = { user: { findUnique } } as unknown as PrismaService;

        const result = await new ExportUserDataUseCase(prisma).execute(user, undefined);

        expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user-1" });
        expect(result.account.email).toBe("user-1@test.fr");
        expect(result.trips[0].destinationLabel).toBe("B");
        expect(result.favoriteAddresses[0].createdAt).toBe(now.toISOString());
        expect(result.favoriteAddresses[0].isHome).toBe(true);
        expect(result.preferences?.lastDepartureWindowMinutes).toBe(120);
        expect(typeof result.exportedAt).toBe("string");
        expect(result.routines[0]).toEqual({
            name: "Travail",
            origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
            destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
            arrivalTime: "09:00",
            usualDepartureTime: "07:41",
            weekdays: [1, 2, 3, 4, 5],
            lineIds: ["C00881", "C01731", "C01742"],
            createdAt: now.toISOString(),
            dayPlan: {
                serviceDay: "2026-07-18",
                planOrigin: "usual",
                itinerary: { legs: [], durationSeconds: 3600 },
                updatedAt: now.toISOString(),
            },
        });
    });

    it("exporte une liste vide pour un compte sans routine, et null pour une routine sans trajet du jour", async () => {
        const accountWithoutRoutine = {
            email: "user-1@test.fr",
            name: null,
            preferences: null,
            favoriteAddresses: [],
            trips: [],
            carbonEntries: [],
            routines: [],
        };
        const withoutRoutine = { user: { findUnique: async () => accountWithoutRoutine } } as unknown as PrismaService;

        const emptyExport = await new ExportUserDataUseCase(withoutRoutine).execute(user, undefined);

        expect(emptyExport.routines).toEqual([]);

        const now = new Date("2026-07-18T10:00:00Z");
        const routine = {
            name: "Travail",
            originLabel: "A",
            originLat: 48.5,
            originLng: 2.6,
            destLabel: "B",
            destLat: 48.9,
            destLng: 2.2,
            arrivalTime: "09:00",
            usualDepartureTime: "07:41",
            weekdays: [1],
            lineIds: ["C00881"],
            createdAt: now,
            dayPlan: null,
        };
        const withRoutine = {
            user: { findUnique: async () => ({ ...accountWithoutRoutine, routines: [routine] }) },
        } as unknown as PrismaService;

        const routineExport = await new ExportUserDataUseCase(withRoutine).execute(user, undefined);

        expect(routineExport.routines[0].dayPlan).toBeNull();
    });

    it("user introuvable → NotFound", async () => {
        const prisma = { user: { findUnique: async () => null } } as unknown as PrismaService;

        await expect(new ExportUserDataUseCase(prisma).execute(user, undefined)).rejects.toThrow();
    });
});