import { describe, expect, it, vi } from "vitest";
import { GetCarbonSummaryUseCase } from "./get-carbon-summary.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";

function makeEntry(overrides: Record<string, unknown> = {}) {
    return {
        id: "e1",
        tripId: "t1",
        mode: "tram",
        distanceKm: 4,
        carbonGrams: 17.76,
        savedVsCar: 550.24,
        createdAt: new Date(),
        ...overrides,
    };
}

describe("GetCarbonSummaryUseCase", () => {
    it("mappe les CarbonEntry du user en résumé agrégé, objectif mensuel inclus", async () => {
        const entries = [
            makeEntry({ id: "e1", tripId: "t1", mode: "tram" }),
            makeEntry({ id: "e2", tripId: "t1", mode: "walk", distanceKm: 1, carbonGrams: 0, savedVsCar: 142 }),
        ];
        const prisma = {
            carbonEntry: { findMany: async () => entries },
            preferences: { findUnique: async () => ({ monthlyGoalKg: 20 }) },
        } as unknown as PrismaService;

        const summary = await new GetCarbonSummaryUseCase(prisma).execute({ userId: "u1", period: "month" });

        expect(summary.tripCount).toBe(1); // deux entries, même tripId
        expect(summary.totalCarbonGrams).toBeCloseTo(17.76, 5);
        expect(summary.totalSavedGrams).toBeCloseTo(692.24, 5);
        expect(summary.goal?.targetKg).toBe(20);
        expect(summary.goal?.achievedKg).toBeCloseTo(0.69224, 5);
    });

    it("période 'week' → objectif null et préférences non lues", async () => {
        const findUnique = vi.fn(async () => ({ monthlyGoalKg: 20 }));
        const prisma = {
            carbonEntry: { findMany: async () => [] },
            preferences: { findUnique },
        } as unknown as PrismaService;

        const summary = await new GetCarbonSummaryUseCase(prisma).execute({ userId: "u1", period: "week" });

        expect(summary.goal).toBeNull();
        expect(findUnique).not.toHaveBeenCalled();
    });

    it("aucun trajet → résumé vide", async () => {
        const prisma = {
            carbonEntry: { findMany: async () => [] },
            preferences: { findUnique: async () => null },
        } as unknown as PrismaService;

        const summary = await new GetCarbonSummaryUseCase(prisma).execute({ userId: "u1", period: "month" });

        expect(summary.tripCount).toBe(0);
        expect(summary.totalSavedGrams).toBe(0);
        expect(summary.goal).toBeNull();
    });
});
