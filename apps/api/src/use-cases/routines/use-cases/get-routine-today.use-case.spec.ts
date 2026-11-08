import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { InMemoryCacheStore } from "../../../shared/cache/in-memory-cache-store";
import type { PrismaService } from "../../../shared/database/prisma.service";
import type { Departure, DeparturesProvider, TransitLeg, TransitRoutingProvider } from "../../transport/transit.providers";
import type { DatedItinerary } from "../../trips/trip-route.mapper";
import { RoutineConnectionsService } from "../routine-connections.service";
import { RoutineDayPlanner } from "../routine-day-planner.service";
import { GetRoutineTodayUseCase } from "./get-routine-today.use-case";

/** Scénarios de la spec, avec les vrais services : seules la base et les sources PRIM sont simulées. */

const user: AuthenticatedUser = { userId: "user-1", email: "user-1@test.fr" };
const LINES = ["C00881", "C01731"];
const BUS_ARRIVAL_REF = "STIF:StopPoint:Q:31031:";
const MELUN_REF = "STIF:StopArea:SP:47909:";

const MONDAY_0700 = new Date("2026-11-09T06:00:00Z");
const MONDAY_0752 = new Date("2026-11-09T06:52:00Z");

const routine = {
    id: "routine-1",
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
    lineIds: LINES,
};

const geometry = { type: "LineString" as const, coordinates: [[2.65, 48.53] as [number, number]] };

const busLeg: TransitLeg = {
    mode: "bus",
    geometry,
    distanceMeters: 3000,
    durationSeconds: 480,
    lineId: "C00881",
    lineShortName: "3601",
    departureStopName: "Henri Wallon",
    arrivalStopName: "Gare Thiers",
    scheduledDepartureTime: "2026-11-09T07:38:00+01:00",
    scheduledArrivalTime: "2026-11-09T07:46:00+01:00",
    arrivalStopPointRef: BUS_ARRIVAL_REF,
};

const walkLeg: TransitLeg = { mode: "walk", geometry, distanceMeters: 300, durationSeconds: 259 };

const trainLeg: TransitLeg = {
    mode: "train",
    geometry,
    distanceMeters: 40_000,
    durationSeconds: 1830,
    lineId: "C01731",
    lineShortName: "R",
    departureStopName: "Melun",
    arrivalStopName: "Gare de Lyon",
    scheduledDepartureTime: "2026-11-09T07:55:30+01:00",
    scheduledArrivalTime: "2026-11-09T08:26:00+01:00",
    departureStopPointRef: MELUN_REF,
};

const usualTrip: DatedItinerary = {
    legs: [busLeg, walkLeg, trainLeg],
    durationSeconds: 2880,
    departureTime: "2026-11-09T07:38:00+01:00",
    arrivalTime: "2026-11-09T08:26:00+01:00",
};

function tripVia(lineId: string, departureTime: string, arrivalTime: string): DatedItinerary {
    const leg: TransitLeg = {
        ...trainLeg,
        lineId,
        lineShortName: lineId,
        scheduledDepartureTime: departureTime,
        expectedDepartureTime: departureTime,
        dataFreshness: "scheduled",
    };
    return { legs: [walkLeg, leg], durationSeconds: 3000, departureTime, arrivalTime };
}

const planBTrip = tripVia("C01728", "2026-11-09T07:50:00+01:00", "2026-11-09T08:40:00+01:00");

function passage(lineRef: string, scheduledTime: string, expectedArrivalTime?: string): Departure {
    return {
        lineRef,
        destinationName: "",
        scheduledTime,
        expectedTime: scheduledTime,
        delaySeconds: 0,
        dataFreshness: "realtime",
        scheduledArrivalTime: expectedArrivalTime ? scheduledTime : undefined,
        expectedArrivalTime,
    };
}

const busOnTime = passage("C00881", "2026-11-09T07:46:00+01:00", "2026-11-09T07:46:00+01:00");
const busLate = passage("C00881", "2026-11-09T07:46:00+01:00", "2026-11-09T08:15:00+01:00");
const trainOnTime = passage("C01731", "2026-11-09T07:55:30+01:00");

interface Sources {
    onLines?: TransitRoutingProvider["getItinerariesOnLines"];
    withNotices?: TransitRoutingProvider["getItinerariesWithNotices"];
    departingFrom?: TransitRoutingProvider["getItinerariesDepartingFrom"];
    passages?: DeparturesProvider["getNextDepartures"];
}

/** Une base en mémoire, partagée entre deux instances pour simuler un redémarrage du serveur. */
function makeDatabase(routines: (typeof routine)[] = [routine]) {
    const dayPlans = new Map<string, Record<string, unknown>>();
    const findMany = vi.fn(async (_arg: { where: { userId: string } }) =>
        routines.map((stored) => ({ ...stored, dayPlan: dayPlans.get(stored.id) ?? null })),
    );
    const prisma = {
        routine: { findMany },
        preferences: { findUnique: async () => ({ wheelchairAccess: false }) },
        routineDayPlan: {
            findUnique: async ({ where }: { where: { routineId: string } }) => dayPlans.get(where.routineId) ?? null,
            upsert: async ({ where, create }: { where: { routineId: string }; create: Record<string, unknown> }) => {
                const planB = create.planB === Prisma.DbNull ? null : create.planB;
                dayPlans.set(where.routineId, { ...create, planB, updatedAt: new Date() });
            },
            update: async ({ where, data }: { where: { routineId: string }; data: Record<string, unknown> }) => {
                dayPlans.set(where.routineId, { ...dayPlans.get(where.routineId), ...data });
            },
        },
    } as unknown as PrismaService;
    return {
        prisma,
        findMany,
        seedDayPlan: (plan: Record<string, unknown>, routineId = "routine-1") => {
            dayPlans.set(routineId, plan);
        },
    };
}

function makeUseCase(prisma: PrismaService, sources: Sources = {}) {
    const getItinerariesOnLines = vi.fn(sources.onLines ?? (async () => [usualTrip]));
    const getItinerariesDepartingFrom = vi.fn(sources.departingFrom ?? (async () => [planBTrip]));
    const provider: TransitRoutingProvider = {
        getItineraries: async () => [],
        getItinerariesArrivingBefore: async () => [],
        getItinerariesDepartingFrom,
        getItinerariesOnLines,
        getItinerariesWithNotices: sources.withNotices ?? (async () => ({ itineraries: [], notices: [] })),
        getScheduledDepartures: async () => [],
    };
    const getNextDepartures = vi.fn<DeparturesProvider["getNextDepartures"]>(
        sources.passages ??
            (async (reference) => (reference === BUS_ARRIVAL_REF ? [busOnTime] : reference === MELUN_REF ? [trainOnTime] : [])),
    );
    const useCase = new GetRoutineTodayUseCase(
        prisma,
        new RoutineDayPlanner(prisma, provider),
        new RoutineConnectionsService({ getNextDepartures }, provider, new InMemoryCacheStore()),
        provider,
    );
    return { useCase, getItinerariesOnLines, getItinerariesDepartingFrom, getNextDepartures };
}

describe("GetRoutineTodayUseCase", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("silence hors créneau : aucun appel externe", async () => {
        vi.setSystemTime(new Date("2026-11-09T04:00:00Z"));
        const { useCase, getItinerariesOnLines, getNextDepartures } = makeUseCase(makeDatabase().prisma);

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("none");
        expect(getItinerariesOnLines).not.toHaveBeenCalled();
        expect(getNextDepartures).not.toHaveBeenCalled();
    });

    it("silence un jour non choisi", async () => {
        vi.setSystemTime(new Date("2026-11-08T06:00:00Z"));
        const { useCase, getItinerariesOnLines } = makeUseCase(makeDatabase().prisma);

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("none");
        expect(getItinerariesOnLines).not.toHaveBeenCalled();
    });

    it("ne lit que les routines du compte courant", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { prisma, findMany } = makeDatabase();

        await makeUseCase(prisma).useCase.execute(user, undefined);

        expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
    });

    it("jour normal : l'heure de départ, le trajet et la marge", async () => {
        vi.setSystemTime(MONDAY_0700);

        const today = await makeUseCase(makeDatabase().prisma).useCase.execute(user, undefined);

        expect(today.status).toBe("ok");
        expect(today.phase).toBe("before_departure");
        expect(today.routine).toEqual({
            id: "routine-1",
            name: "Travail",
            destinationLabel: "La Défense",
            arrivalTime: "09:00",
        });
        expect(today.route?.departureTime).toBe("2026-11-09T07:38:00+01:00");
        expect(today.connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "realtime" });
        expect(today.planB?.arrivalTime).toBe("2026-11-09T08:40:00+01:00");
        expect(today.arrivesLate).toBe(false);
    });

    it("bus en retard : correspondance perdue, deux solutions au plus, triées par arrivée", async () => {
        vi.setSystemTime(MONDAY_0752);
        const late = tripVia("C01728", "2026-11-09T08:30:00+01:00", "2026-11-09T09:32:00+01:00");
        const soon = tripVia("C01728", "2026-11-09T08:20:00+01:00", "2026-11-09T09:14:00+01:00");
        const latest = tripVia("C01728", "2026-11-09T08:40:00+01:00", "2026-11-09T09:50:00+01:00");
        const { useCase, getItinerariesDepartingFrom } = makeUseCase(makeDatabase().prisma, {
            departingFrom: async () => [late, latest, soon],
            passages: async (reference) => (reference === BUS_ARRIVAL_REF ? [busLate] : [trainOnTime]),
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("connection_lost");
        expect(today.phase).toBe("on_the_way");
        expect(today.alternatives.map((alternative) => alternative.route.arrivalTime)).toEqual([
            "2026-11-09T09:14:00+01:00",
            "2026-11-09T09:32:00+01:00",
        ]);
        expect(today.alternativesStatus).toBe("ok");
        expect(today.alternatives[0].verdict).toEqual({ kind: "tight", marginMinutes: 0, basis: "realtime" });
        expect(getItinerariesDepartingFrom).toHaveBeenLastCalledWith(
            { latitude: 48.53, longitude: 2.65 },
            { latitude: 48.892, longitude: 2.238 },
            false,
            "2026-11-09T08:15",
        );
    });

    it("correspondance perdue, solutions en panne : le bloc reste et le dit", async () => {
        vi.setSystemTime(MONDAY_0752);
        const { prisma } = makeDatabase();
        await makeUseCase(prisma).useCase.execute(user, undefined);
        const { useCase } = makeUseCase(prisma, {
            departingFrom: async () => {
                throw new Error("panne");
            },
            passages: async (reference) => (reference === BUS_ARRIVAL_REF ? [busLate] : [trainOnTime]),
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("connection_lost");
        expect(today.alternatives).toEqual([]);
        expect(today.alternativesStatus).toBe("unavailable");
    });

    it("trajet habituel qui ne circule pas : le dit, cite IDFM et propose un autre trajet", async () => {
        vi.setSystemTime(MONDAY_0700);
        const other = tripVia("C01728", "2026-11-09T07:25:00+01:00", "2026-11-09T08:50:00+01:00");
        const { useCase } = makeUseCase(makeDatabase().prisma, {
            onLines: async () => [],
            withNotices: async () => ({
                itineraries: [other],
                notices: [
                    {
                        lineId: "C00881",
                        lineShortName: "3601",
                        text: "Travaux rue Saint Liesne",
                        periods: [{ begin: "2026-11-09T04:00:00+01:00", end: "2026-11-10T04:00:00+01:00" }],
                    },
                ],
            }),
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("disrupted");
        expect(today.route?.departureTime).toBe("2026-11-09T07:25:00+01:00");
        expect(today.notices).toEqual([{ lineShortName: "3601", text: "Travaux rue Saint Liesne" }]);
    });

    it("aucun trajet du tout : statut perturbé sans route", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { useCase } = makeUseCase(makeDatabase().prisma, { onLines: async () => [] });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("disrupted");
        expect(today.route).toBeNull();
        expect(today.connections).toEqual([]);
    });

    it("SIRI en panne : le bloc reste sur les marges prévues", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { useCase } = makeUseCase(makeDatabase().prisma, {
            passages: async () => {
                throw new Error("panne");
            },
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("ok");
        expect(today.realtimeStatus).toBe("unavailable");
        expect(today.connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
    });

    it("calculateur en panne sans plan connu : routine indisponible", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { useCase } = makeUseCase(makeDatabase().prisma, {
            onLines: async () => {
                throw new Error("panne");
            },
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).toBe("unavailable");
        expect(today.routine?.id).toBe("routine-1");
        expect(today.route).toBeNull();
    });

    it("serveur redémarré à 07:52 : même trajet figé, sans appel au calculateur", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { prisma } = makeDatabase();
        await makeUseCase(prisma).useCase.execute(user, undefined);

        vi.setSystemTime(MONDAY_0752);
        const restarted = makeUseCase(prisma);
        const today = await restarted.useCase.execute(user, undefined);

        expect(today.phase).toBe("on_the_way");
        expect(today.route?.departureTime).toBe("2026-11-09T07:38:00+01:00");
        expect(restarted.getItinerariesOnLines).not.toHaveBeenCalled();
    });

    it("silence après l'arrivée estimée", async () => {
        vi.setSystemTime(MONDAY_0700);
        const { prisma } = makeDatabase();
        await makeUseCase(prisma).useCase.execute(user, undefined);

        vi.setSystemTime(new Date("2026-11-09T07:27:00Z"));
        const today = await makeUseCase(prisma).useCase.execute(user, undefined);

        expect(today.status).toBe("none");
    });

    it("une routine terminée ne masque pas la suivante, déjà dans son créneau", async () => {
        const nextRoutine = { ...routine, id: "routine-2", name: "Sport", arrivalTime: "10:00", usualDepartureTime: "09:00" };
        const { prisma, seedDayPlan } = makeDatabase([routine, nextRoutine]);
        seedDayPlan({
            routineId: "routine-1",
            serviceDay: "2026-11-09",
            itinerary: usualTrip,
            planB: null,
            planBStatus: "no_result",
            alternatives: null,
            planOrigin: "usual",
            disrupted: false,
            notices: null,
            updatedAt: MONDAY_0700,
        });
        const laterTrip = tripVia("C00881", "2026-11-09T09:00:00+01:00", "2026-11-09T09:50:00+01:00");
        vi.setSystemTime(new Date("2026-11-09T07:30:00Z"));
        const { useCase } = makeUseCase(prisma, {
            onLines: async () => [{ ...laterTrip, legs: usualTrip.legs }],
        });

        const today = await useCase.execute(user, undefined);

        expect(today.status).not.toBe("none");
        expect(today.routine?.id).toBe("routine-2");
    });

    it("arrivée après l'heure visée : l'écran peut le dire", async () => {
        vi.setSystemTime(MONDAY_0700);
        const lateTrip = { ...usualTrip, arrivalTime: "2026-11-09T09:30:00+01:00" };
        const { prisma, seedDayPlan } = makeDatabase();
        seedDayPlan({
            routineId: "routine-1",
            serviceDay: "2026-11-09",
            itinerary: lateTrip,
            planB: null,
            planBStatus: "no_result",
            alternatives: null,
            planOrigin: "replanned",
            disrupted: false,
            notices: null,
            updatedAt: MONDAY_0700,
        });

        const today = await makeUseCase(prisma).useCase.execute(user, undefined);

        expect(today.arrivesLate).toBe(true);
    });
});
