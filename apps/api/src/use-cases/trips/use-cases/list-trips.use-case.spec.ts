import { describe, expect, it, vi } from "vitest";
import { ListTripsUseCase } from "./list-trips.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };

describe("ListTripsUseCase", () => {
    it("liste paginée du user, mappe destLabel→destinationLabel et somme savedGrams", async () => {
        const trip = {
            id: "trip-1",
            createdAt: new Date("2026-07-10T08:00:00Z"),
            originLabel: "Domicile",
            destLabel: "Victor Hugo",
            originLat: 45.1885,
            originLng: 5.7245,
            destLat: 45.1912,
            destLng: 5.7301,
            modes: ["bike"],
            durationSeconds: 1080,
            distanceMeters: 4000,
            carbonGrams: 0,
            carbonEntries: [{ savedVsCar: 56.8 }],
        };
        const findMany = vi.fn(async (_arg: { where: { userId: string }; skip: number; take: number }) => [trip]);
        const prisma = {
            trip: {
                count: async () => 1,
                findMany,
                aggregate: async () => ({ _sum: { durationSeconds: 1080 } }),
            },
            carbonEntry: { aggregate: async () => ({ _sum: { savedVsCar: 56.8 } }) },
        } as unknown as PrismaService;

        const result = await new ListTripsUseCase(prisma).execute(user, { period: "all", page: 2, pageSize: 10 });

        expect(findMany.mock.calls[0][0].where.userId).toBe("user-1");
        expect(findMany.mock.calls[0][0].skip).toBe(10);
        expect(findMany.mock.calls[0][0].take).toBe(10);
        expect(result.items[0].destinationLabel).toBe("Victor Hugo");
        expect(result.items[0].origin).toEqual({ latitude: 45.1885, longitude: 5.7245 });
        expect(result.items[0].destination).toEqual({ latitude: 45.1912, longitude: 5.7301 });
        expect(result.items[0].savedGrams).toBeCloseTo(56.8, 5);
        expect(result.total).toBe(1);
        expect(result.totalSavedGrams).toBeCloseTo(56.8, 5);
        expect(result.totalDurationSeconds).toBe(1080);
    });

    it("valeurs par défaut (page 1, pageSize 10) et agrégats vides → 0", async () => {
        const prisma = {
            trip: {
                count: async () => 0,
                findMany: async () => [],
                aggregate: async () => ({ _sum: { durationSeconds: null } }),
            },
            carbonEntry: { aggregate: async () => ({ _sum: { savedVsCar: null } }) },
        } as unknown as PrismaService;

        const result = await new ListTripsUseCase(prisma).execute(user, {});

        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.totalSavedGrams).toBe(0);
        expect(result.totalDurationSeconds).toBe(0);
        expect(result.items).toEqual([]);
    });
});