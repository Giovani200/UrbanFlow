import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { TransitItinerary, TransitRoutingProvider } from "../../transport/transit.providers";
import { RoutineDayPlanner } from "../routine-day-planner.service";
import { ChooseAlternativeUseCase } from "./choose-alternative.use-case";
import { MarkNotTakenUseCase } from "./mark-not-taken.use-case";

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };
const NOW = new Date("2026-11-09T06:52:00Z");
const SERVICE_DAY = "2026-11-09";

const routine = {
    id: "routine-1",
    originLat: 48.5244,
    originLng: 2.6437,
    destLat: 48.892,
    destLng: 2.238,
    arrivalTime: "09:00",
    usualDepartureTime: "07:41",
    lineIds: ["C00881"],
};

function trip(departureTime: string, arrivalTime: string): TransitItinerary & { departureTime: string; arrivalTime: string } {
    return {
        legs: [
            {
                mode: "train",
                geometry: { type: "LineString", coordinates: [] },
                distanceMeters: 1000,
                durationSeconds: 600,
                lineId: "C01728",
            },
        ],
        durationSeconds: 3000,
        departureTime,
        arrivalTime,
    };
}

const firstAlternative = trip("2026-11-09T08:20:00+01:00", "2026-11-09T09:14:00+01:00");
const secondAlternative = trip("2026-11-09T08:42:00+01:00", "2026-11-09T09:32:00+01:00");

function storedPlan(alternatives: unknown) {
    return {
        routineId: "routine-1",
        serviceDay: SERVICE_DAY,
        itinerary: trip("2026-11-09T07:38:00+01:00", "2026-11-09T08:45:00+01:00"),
        planB: null,
        planBStatus: "ok",
        alternatives,
        planOrigin: "usual",
        disrupted: false,
        notices: null,
        updatedAt: NOW,
    };
}

function makeSetup(options: { ownsRoutine?: boolean; stored?: object | null; departingFrom?: TransitRoutingProvider["getItinerariesDepartingFrom"] } = {}) {
    const findFirst = vi.fn(async (_arg: { where: { id: string; userId: string } }) =>
        options.ownsRoutine === false ? null : routine,
    );
    const upsert = vi.fn(async (_arg: { create: Record<string, unknown> }) => ({}));
    const routineUpdate = vi.fn();
    const prisma = {
        routine: { findFirst, update: routineUpdate },
        preferences: { findUnique: async () => ({ wheelchairAccess: true }) },
        routineDayPlan: { findUnique: async () => options.stored ?? null, upsert },
    } as unknown as PrismaService;
    const getItinerariesDepartingFrom = vi.fn(
        options.departingFrom ?? (async () => [secondAlternative, firstAlternative]),
    );
    const provider = { getItinerariesDepartingFrom } as unknown as TransitRoutingProvider;
    const planner = new RoutineDayPlanner(prisma, provider);
    return {
        markNotTaken: new MarkNotTakenUseCase(prisma, planner, provider),
        chooseAlternative: new ChooseAlternativeUseCase(prisma, planner),
        findFirst,
        upsert,
        routineUpdate,
        getItinerariesDepartingFrom,
    };
}

describe("corrections du trajet du jour", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("Je n'ai pas pris ce bus", () => {
        it("recalcule depuis la position, et le trajet qui arrive le plus tôt devient celui du jour", async () => {
            const { markNotTaken, getItinerariesDepartingFrom, upsert } = makeSetup();
            const position = { latitude: 48.6, longitude: 2.5 };

            const result = await markNotTaken.execute(user, { routineId: "routine-1", position });

            expect(result).toEqual({ routineId: "routine-1" });
            expect(getItinerariesDepartingFrom.mock.calls[0]).toEqual([
                position,
                { latitude: 48.892, longitude: 2.238 },
                true,
                "2026-11-09T07:52",
            ]);
            expect(upsert.mock.calls[0][0].create).toMatchObject({
                serviceDay: SERVICE_DAY,
                itinerary: firstAlternative,
                planOrigin: "replanned",
            });
        });

        it("sans position, repart du point de départ de la routine", async () => {
            const { markNotTaken, getItinerariesDepartingFrom } = makeSetup();

            await markNotTaken.execute(user, { routineId: "routine-1" });

            expect(getItinerariesDepartingFrom.mock.calls[0][0]).toEqual({ latitude: 48.5244, longitude: 2.6437 });
        });

        it("aucun trajet : erreur métier et plan inchangé", async () => {
            const { markNotTaken, upsert } = makeSetup({ departingFrom: async () => [] });

            await expect(markNotTaken.execute(user, { routineId: "routine-1" })).rejects.toThrow(ConflictException);
            expect(upsert).not.toHaveBeenCalled();
        });

        it("calculateur en panne : erreur et plan inchangé", async () => {
            const { markNotTaken, upsert } = makeSetup({
                departingFrom: async () => {
                    throw new Error("panne");
                },
            });

            await expect(markNotTaken.execute(user, { routineId: "routine-1" })).rejects.toThrow("panne");
            expect(upsert).not.toHaveBeenCalled();
        });

        it("routine d'un autre compte : 404", async () => {
            const { markNotTaken, findFirst, getItinerariesDepartingFrom } = makeSetup({ ownsRoutine: false });

            await expect(markNotTaken.execute(user, { routineId: "routine-2" })).rejects.toThrow(NotFoundException);
            expect(findFirst.mock.calls[0][0].where).toEqual({ id: "routine-2", userId: "user-1" });
            expect(getItinerariesDepartingFrom).not.toHaveBeenCalled();
        });
    });

    describe("Prendre une solution", () => {
        const withAlternatives = storedPlan([firstAlternative, secondAlternative]);

        it.each([
            [0, firstAlternative],
            [1, secondAlternative],
        ] as const)("la solution %i devient le trajet du jour, sans alternative restante", async (alternativeIndex, chosen) => {
            const { chooseAlternative, upsert } = makeSetup({ stored: withAlternatives });

            await chooseAlternative.execute(user, { routineId: "routine-1", alternativeIndex });

            expect(upsert.mock.calls[0][0].create).toMatchObject({
                itinerary: chosen,
                planOrigin: "alternative",
                alternatives: [],
            });
        });

        it("ne modifie jamais la routine elle-même", async () => {
            const { chooseAlternative, routineUpdate } = makeSetup({ stored: withAlternatives });

            await chooseAlternative.execute(user, { routineId: "routine-1", alternativeIndex: 0 });

            expect(routineUpdate).not.toHaveBeenCalled();
        });

        it("solution absente de la liste : erreur et plan inchangé", async () => {
            const { chooseAlternative, upsert } = makeSetup({ stored: storedPlan([firstAlternative]) });

            await expect(
                chooseAlternative.execute(user, { routineId: "routine-1", alternativeIndex: 1 }),
            ).rejects.toThrow(ConflictException);
            expect(upsert).not.toHaveBeenCalled();
        });

        it("plan d'un autre jour : erreur et plan inchangé", async () => {
            const stored = { ...withAlternatives, serviceDay: "2026-11-06" };
            const { chooseAlternative, upsert } = makeSetup({ stored });

            await expect(
                chooseAlternative.execute(user, { routineId: "routine-1", alternativeIndex: 0 }),
            ).rejects.toThrow(ConflictException);
            expect(upsert).not.toHaveBeenCalled();
        });

        it("routine d'un autre compte : 404", async () => {
            const { chooseAlternative } = makeSetup({ ownsRoutine: false, stored: withAlternatives });

            await expect(
                chooseAlternative.execute(user, { routineId: "routine-2", alternativeIndex: 0 }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
