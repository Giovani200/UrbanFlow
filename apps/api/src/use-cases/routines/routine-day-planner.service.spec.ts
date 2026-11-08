import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../shared/database/prisma.service";
import type { LineNotice, TransitItinerary, TransitLeg, TransitRoutingProvider } from "../transport/transit.providers";
import { RoutineDayPlanner, type RoutineForPlanning } from "./routine-day-planner.service";

const SERVICE_DAY = "2026-11-09";
const BEFORE_DEPARTURE = new Date("2026-11-09T06:00:00Z");
const AFTER_DEPARTURE = new Date("2026-11-09T06:52:00Z");
const LINES = ["C00881", "C01731", "C01742"];

const routine: RoutineForPlanning = {
    id: "routine-1",
    originLat: 48.5244,
    originLng: 2.6437,
    destLat: 48.892,
    destLng: 2.238,
    arrivalTime: "09:00",
    usualDepartureTime: "07:41",
    lineIds: LINES,
};

function leg(lineId: string): TransitLeg {
    return {
        mode: "train",
        geometry: { type: "LineString", coordinates: [] },
        distanceMeters: 1000,
        durationSeconds: 600,
        lineId,
        lineShortName: lineId,
    };
}

function itinerary(departureTime: string, arrivalTime: string, lineIds: string[] = LINES): TransitItinerary {
    return { legs: lineIds.map(leg), durationSeconds: 3600, departureTime, arrivalTime };
}

const usualTrip = itinerary("2026-11-09T07:37:59+01:00", "2026-11-09T08:45:58+01:00");
const planBTrip = itinerary("2026-11-09T07:50:00+01:00", "2026-11-09T09:14:00+01:00", ["C01728"]);
const otherTrip = itinerary("2026-11-09T07:20:00+01:00", "2026-11-09T08:50:00+01:00", ["C01728", "C01742"]);
const workNotice: LineNotice = {
    lineId: "C01731",
    lineShortName: "R",
    text: "Travaux",
    periods: [{ begin: "2026-11-09T04:00:00+01:00", end: "2026-11-10T04:00:00+01:00" }],
};

interface Setup {
    stored?: object | null;
    onLines?: TransitRoutingProvider["getItinerariesOnLines"];
    withNotices?: TransitRoutingProvider["getItinerariesWithNotices"];
    departingFrom?: TransitRoutingProvider["getItinerariesDepartingFrom"];
}

function makePlanner(setup: Setup = {}) {
    const findUnique = vi.fn(async () => setup.stored ?? null);
    const upsert = vi.fn(async (_arg: { where: object; create: Record<string, unknown>; update: Record<string, unknown> }) => ({}));
    const prisma = { routineDayPlan: { findUnique, upsert } } as unknown as PrismaService;

    const getItinerariesOnLines = vi.fn(setup.onLines ?? (async () => [usualTrip]));
    const getItinerariesWithNotices = vi.fn(setup.withNotices ?? (async () => ({ itineraries: [otherTrip], notices: [workNotice] })));
    const getItinerariesDepartingFrom = vi.fn(setup.departingFrom ?? (async () => [planBTrip]));
    const provider: TransitRoutingProvider = {
        getItineraries: async () => [],
        getItinerariesArrivingBefore: async () => [],
        getItinerariesDepartingFrom,
        getItinerariesOnLines,
        getItinerariesWithNotices,
        getScheduledDepartures: async () => [],
    };

    return {
        planner: new RoutineDayPlanner(prisma, provider),
        upsert,
        getItinerariesOnLines,
        getItinerariesWithNotices,
        getItinerariesDepartingFrom,
    };
}

function storedPlan(overrides: object = {}) {
    return {
        routineId: "routine-1",
        serviceDay: SERVICE_DAY,
        itinerary: usualTrip,
        planB: planBTrip,
        planBStatus: "ok",
        alternatives: null,
        planOrigin: "usual",
        disrupted: false,
        notices: null,
        updatedAt: new Date("2026-11-09T05:55:00Z"),
        ...overrides,
    };
}

describe("RoutineDayPlanner.planFor", () => {
    describe("première ouverture du jour", () => {
        it("calcule le trajet sur les lignes mémorisées, pour l'heure d'arrivée visée", async () => {
            const { planner, getItinerariesOnLines } = makePlanner();

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
            expect(plan.planOrigin).toBe("usual");
            expect(plan.disrupted).toBe(false);
            expect(getItinerariesOnLines).toHaveBeenCalledWith(
                { latitude: 48.5244, longitude: 2.6437 },
                { latitude: 48.892, longitude: 2.238 },
                false,
                "2026-11-09T09:00",
                LINES,
            );
        });

        it("calcule le Plan B une minute après le départ, depuis le point de départ", async () => {
            const { planner, getItinerariesDepartingFrom } = makePlanner();

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.planB).toEqual(planBTrip);
            expect(plan.planBStatus).toBe("ok");
            expect(getItinerariesDepartingFrom).toHaveBeenCalledWith(
                { latitude: 48.5244, longitude: 2.6437 },
                { latitude: 48.892, longitude: 2.238 },
                false,
                "2026-11-09T07:38",
            );
        });

        it("écrit le plan du jour en base", async () => {
            const { planner, upsert } = makePlanner();

            await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);
            const [{ where, create }] = upsert.mock.calls[0];

            expect(where).toEqual({ routineId: "routine-1" });
            expect(create).toMatchObject({ routineId: "routine-1", serviceDay: SERVICE_DAY, planOrigin: "usual", disrupted: false });
        });

        it("transmet l'option fauteuil à chaque calcul", async () => {
            const { planner, getItinerariesOnLines, getItinerariesDepartingFrom } = makePlanner();

            await planner.planFor(routine, SERVICE_DAY, true, BEFORE_DEPARTURE);

            expect(getItinerariesOnLines.mock.calls[0][2]).toBe(true);
            expect(getItinerariesDepartingFrom.mock.calls[0][2]).toBe(true);
        });

        it("retient le plus tardif qui utilise toutes les lignes, pas celui qui saute le bus", async () => {
            const withoutBus = itinerary("2026-11-09T07:38:30+01:00", "2026-11-09T08:45:58+01:00", ["C01731", "C01742"]);
            const { planner } = makePlanner({ onLines: async () => [usualTrip, withoutBus] });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
        });

        it("Plan B en panne : le trajet reste, seule cette partie l'indique", async () => {
            const { planner } = makePlanner({
                departingFrom: async () => {
                    throw new Error("panne");
                },
            });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
            expect(plan.planB).toBeNull();
            expect(plan.planBStatus).toBe("unavailable");
        });

        it("calculateur en panne sans plan connu : lève l'erreur", async () => {
            const { planner } = makePlanner({
                onLines: async () => {
                    throw new Error("panne");
                },
            });

            await expect(planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE)).rejects.toThrow("panne");
        });
    });

    describe("plan déjà connu", () => {
        it("le reprend sans appel s'il a moins de 15 min", async () => {
            const { planner, getItinerariesOnLines, getItinerariesDepartingFrom } = makePlanner({ stored: storedPlan() });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
            expect(getItinerariesOnLines).not.toHaveBeenCalled();
            expect(getItinerariesDepartingFrom).not.toHaveBeenCalled();
        });

        it("le recalcule à 15 min, tant que le départ n'est pas passé", async () => {
            const stored = storedPlan({ updatedAt: new Date("2026-11-09T05:45:00Z") });
            const { planner, getItinerariesOnLines, upsert } = makePlanner({ stored });

            await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(getItinerariesOnLines).toHaveBeenCalledOnce();
            expect(upsert).toHaveBeenCalledOnce();
        });

        it("garde le plan connu si le recalcul échoue", async () => {
            const stored = storedPlan({ updatedAt: new Date("2026-11-09T05:30:00Z") });
            const { planner } = makePlanner({
                stored,
                onLines: async () => {
                    throw new Error("panne");
                },
            });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
        });

        it("départ passé, serveur redémarré : même trajet, sans appel au calculateur", async () => {
            const stored = storedPlan({ updatedAt: new Date("2026-11-09T06:00:00Z") });
            const { planner, getItinerariesOnLines, getItinerariesDepartingFrom, upsert } = makePlanner({ stored });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, AFTER_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
            expect(getItinerariesOnLines).not.toHaveBeenCalled();
            expect(getItinerariesDepartingFrom).not.toHaveBeenCalled();
            expect(upsert).not.toHaveBeenCalled();
        });

        it.each(["alternative", "replanned"])("ne recalcule jamais un trajet d'origine %s", async (planOrigin) => {
            const stored = storedPlan({ planOrigin, updatedAt: new Date("2026-11-09T05:00:00Z") });
            const { planner, getItinerariesOnLines } = makePlanner({ stored });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.planOrigin).toBe(planOrigin);
            expect(getItinerariesOnLines).not.toHaveBeenCalled();
        });

        it("ignore et écrase le plan de la veille", async () => {
            const stored = storedPlan({ serviceDay: "2026-11-06" });
            const { planner, getItinerariesOnLines, upsert } = makePlanner({ stored });

            await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(getItinerariesOnLines).toHaveBeenCalledOnce();
            expect(upsert.mock.calls[0][0].update).toMatchObject({ serviceDay: SERVICE_DAY });
        });

        it("reprend un plan perturbé avec ses messages", async () => {
            const stored = storedPlan({ disrupted: true, notices: [{ lineShortName: "R", text: "Travaux" }] });
            const { planner } = makePlanner({ stored });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.disrupted).toBe(true);
            expect(plan.notices).toEqual([{ lineShortName: "R", text: "Travaux" }]);
        });
    });

    describe("JSON illisible en base", () => {
        const corrupted = storedPlan({ itinerary: { format: "ancien" } });

        it("avant le départ : recalcule sans planter", async () => {
            const { planner, getItinerariesOnLines } = makePlanner({ stored: corrupted });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.itinerary).toEqual(usualTrip);
            expect(getItinerariesOnLines).toHaveBeenCalledOnce();
        });

        it("après le départ : lève une erreur, car un recalcul changerait peut-être de bus", async () => {
            const { planner, getItinerariesOnLines } = makePlanner({ stored: corrupted });

            await expect(planner.planFor(routine, SERVICE_DAY, false, AFTER_DEPARTURE)).rejects.toThrow();
            expect(getItinerariesOnLines).not.toHaveBeenCalled();
        });
    });

    describe("trajet habituel qui ne circule pas", () => {
        it("sans trajet sur ces lignes : propose le meilleur autre trajet avec les messages", async () => {
            const { planner, getItinerariesWithNotices } = makePlanner({ onLines: async () => [] });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.disrupted).toBe(true);
            expect(plan.itinerary).toEqual(otherTrip);
            expect(plan.notices).toEqual([{ lineShortName: "R", text: "Travaux" }]);
            expect(getItinerariesWithNotices.mock.calls[0][3]).toBe("2026-11-09T09:00");
        });

        it("départ 31 min avant l'heure habituelle : perturbé", async () => {
            const tooEarly = itinerary("2026-11-09T07:10:00+01:00", "2026-11-09T08:20:00+01:00");
            const { planner } = makePlanner({ onLines: async () => [tooEarly] });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.disrupted).toBe(true);
        });

        it("départ 30 min avant l'heure habituelle : normal", async () => {
            const earlier = itinerary("2026-11-09T07:11:00+01:00", "2026-11-09T08:20:00+01:00");
            const { planner, getItinerariesWithNotices } = makePlanner({ onLines: async () => [earlier] });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.disrupted).toBe(false);
            expect(getItinerariesWithNotices).not.toHaveBeenCalled();
        });

        it("n'appelle pas le second calcul un jour normal", async () => {
            const { planner, getItinerariesWithNotices } = makePlanner();

            await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(getItinerariesWithNotices).not.toHaveBeenCalled();
        });

        it("aucun trajet du tout : le dit, sans rien écrire en base", async () => {
            const { planner, upsert } = makePlanner({
                onLines: async () => [],
                withNotices: async () => ({ itineraries: [], notices: [workNotice] }),
            });

            const plan = await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(plan.disrupted).toBe(true);
            expect(plan.itinerary).toBeNull();
            expect(plan.notices).toHaveLength(1);
            expect(upsert).not.toHaveBeenCalled();
        });

        it("écrit la perturbation et ses messages en base", async () => {
            const { planner, upsert } = makePlanner({ onLines: async () => [] });

            await planner.planFor(routine, SERVICE_DAY, false, BEFORE_DEPARTURE);

            expect(upsert.mock.calls[0][0].create).toMatchObject({
                disrupted: true,
                notices: [{ lineShortName: "R", text: "Travaux" }],
            });
        });
    });
});
