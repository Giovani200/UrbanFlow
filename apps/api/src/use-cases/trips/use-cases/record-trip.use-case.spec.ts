import { describe, expect, it, vi } from "vitest";
import { RecordTripUseCase } from "./record-trip.use-case";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { RecordTripDtoIn } from "@urbanflow/app-front-back-lib";

type CarbonEntryCreate = {
    userId: string;
    mode: string;
    distanceKm: number;
    carbonGrams: number;
    savedVsCar: number;
};
type TripCreateArg = {
    data: {
        userId: string;
        status: string;
        modes: string[];
        carbonEntries: { create: CarbonEntryCreate[] };
    };
    select?: unknown;
};

function makeInput(): RecordTripDtoIn {
    const geometry = {
        type: "LineString" as const,
        coordinates: [
            [5.7, 45.1],
            [5.71, 45.11],
        ] as [number, number][],
    };
    return {
        origin: { latitude: 45.1, longitude: 5.7, label: "Départ" },
        destination: { latitude: 45.2, longitude: 5.75, label: "Arrivée" },
        route: {
            segments: [
                { mode: "walk", geometry, durationSeconds: 300, distanceMeters: 400, carbonGrams: 0, savedGrams: 56.8 },
                { mode: "tram", geometry, durationSeconds: 600, distanceMeters: 4000, carbonGrams: 17.76, savedGrams: 550.24 },
            ],
            totalDurationSeconds: 900,
            totalDistanceMeters: 4400,
            totalCarbonGrams: 17.76,
            totalSavedGrams: 607.04,
            score: 0,
        },
    };
}

describe("RecordTripUseCase", () => {
    it("crée un Trip + une CarbonEntry par segment-mode, renvoie tripId", async () => {
        const create = vi.fn(async (_arg: TripCreateArg) => ({ id: "trip-1" }));
        const prisma = { trip: { create } } as unknown as PrismaService;

        const result = await new RecordTripUseCase(prisma).execute(
            { userId: "user-1", email: "user-1@test.fr" },
            makeInput(),
        );

        expect(result).toEqual({ tripId: "trip-1" });

        const { data } = create.mock.calls[0][0];
        expect(data.userId).toBe("user-1");
        expect(data.status).toBe("COMPLETED");
        expect(data.modes).toEqual(["walk", "tram"]);
        expect(data.carbonEntries.create).toHaveLength(2);
        expect(data.carbonEntries.create[0]).toMatchObject({
            userId: "user-1",
            mode: "walk",
            distanceKm: 0.4,
            savedVsCar: 56.8,
        });
    });

    it("entrée invalide (route manquante) → rejet Zod", async () => {
        const prisma = { trip: { create: vi.fn() } } as unknown as PrismaService;

        await expect(
            new RecordTripUseCase(prisma).execute(
                { userId: "user-1", email: "user-1@test.fr" },
                {
                    origin: { latitude: 45.1, longitude: 5.7, label: "Départ" },
                    destination: { latitude: 45.2, longitude: 5.75, label: "Arrivée" },
                },
            ),
        ).rejects.toThrow();
    });
});
