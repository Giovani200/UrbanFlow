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
                weightCarbon: 50,
                weightTime: 30,
                weightCost: 20,
                wheelchairAccess: false,
                avoidStairs: false,
                preferredModes: ["bike"],
                monthlyGoalKg: null,
            },
            favoriteAddresses: [
                { label: "Domicile", address: "12 rue X", latitude: 45.18, longitude: 5.72, createdAt: now },
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
        }));
        const prisma = { user: { findUnique } } as unknown as PrismaService;

        const result = await new ExportUserDataUseCase(prisma).execute(user, undefined);

        expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user-1" });
        expect(result.account.email).toBe("user-1@test.fr");
        expect(result.trips[0].destinationLabel).toBe("B");
        expect(result.favoriteAddresses[0].createdAt).toBe(now.toISOString());
        expect(typeof result.exportedAt).toBe("string");
    });

    it("user introuvable → NotFound", async () => {
        const prisma = { user: { findUnique: async () => null } } as unknown as PrismaService;

        await expect(new ExportUserDataUseCase(prisma).execute(user, undefined)).rejects.toThrow();
    });
});