import { describe, expect, it, vi } from "vitest";
import { InMemoryCacheStore } from "../../shared/cache/in-memory-cache-store";
import type { Departure, DeparturesProvider, TransitLeg, TransitRoutingProvider } from "../transport/transit.providers";
import type { DatedItinerary } from "../trips/trip-route.mapper";
import { RoutineConnectionsService } from "./routine-connections.service";

const BUS_ARRIVAL_REF = "STIF:StopPoint:Q:31031:";
const MELUN_REF = "STIF:StopArea:SP:47909:";
const GARE_DE_LYON_REF = "STIF:StopArea:SP:470195:";
const LA_DEFENSE_REF = "STIF:StopArea:SP:470549:";

const geometry = { type: "LineString" as const, coordinates: [] };

function walk(durationSeconds: number): TransitLeg {
    return { mode: "walk", geometry, distanceMeters: 300, durationSeconds };
}

const busLeg: TransitLeg = {
    mode: "bus",
    geometry,
    distanceMeters: 3000,
    durationSeconds: 480,
    lineId: "C00881",
    lineShortName: "3601",
    dataFreshness: "realtime",
    departureStopName: "Henri Wallon",
    arrivalStopName: "Gare Thiers",
    scheduledDepartureTime: "2026-11-09T07:38:00+01:00",
    expectedDepartureTime: "2026-11-09T07:38:00+01:00",
    scheduledArrivalTime: "2026-11-09T07:46:00+01:00",
    expectedArrivalTime: "2026-11-09T07:46:00+01:00",
    arrivalStopPointRef: BUS_ARRIVAL_REF,
    departureStopPointId: "stop_point:IDFM:31052",
    routeId: "route:bus",
};

const trainLeg: TransitLeg = {
    mode: "train",
    geometry,
    distanceMeters: 40_000,
    durationSeconds: 1830,
    lineId: "C01731",
    lineShortName: "R",
    dataFreshness: "realtime",
    departureStopName: "Melun",
    arrivalStopName: "Gare de Lyon",
    scheduledDepartureTime: "2026-11-09T07:55:30+01:00",
    expectedDepartureTime: "2026-11-09T07:55:30+01:00",
    scheduledArrivalTime: "2026-11-09T08:26:00+01:00",
    expectedArrivalTime: "2026-11-09T08:26:00+01:00",
    departureStopPointRef: MELUN_REF,
    arrivalStopPointRef: GARE_DE_LYON_REF,
    departureStopPointId: "stop_point:IDFM:monomodalStopPlace:47909",
    routeId: "route:R",
};

const rerLeg: TransitLeg = {
    mode: "rer",
    geometry,
    distanceMeters: 12_000,
    durationSeconds: 808,
    lineId: "C01742",
    lineShortName: "A",
    dataFreshness: "realtime",
    departureStopName: "Gare de Lyon",
    arrivalStopName: "La Défense",
    scheduledDepartureTime: "2026-11-09T08:31:01+01:00",
    expectedDepartureTime: "2026-11-09T08:31:01+01:00",
    scheduledArrivalTime: "2026-11-09T08:44:29+01:00",
    expectedArrivalTime: "2026-11-09T08:44:29+01:00",
    departureStopPointRef: GARE_DE_LYON_REF,
    arrivalStopPointRef: LA_DEFENSE_REF,
    departureStopPointId: "stop_point:IDFM:monomodalStopPlace:470195",
    routeId: "route:A",
};

const fullTrip: DatedItinerary = {
    legs: [walk(1), busLeg, walk(259), trainLeg, rerLeg, walk(89)],
    durationSeconds: 4080,
    departureTime: "2026-11-09T07:37:59+01:00",
    arrivalTime: "2026-11-09T08:45:58+01:00",
};

const FREQUENT_DEPARTURES = [
    "2026-11-09T08:00:41+01:00",
    "2026-11-09T08:05:21+01:00",
    "2026-11-09T08:07:41+01:00",
    "2026-11-09T08:12:21+01:00",
];
const RARE_DEPARTURES = [
    "2026-11-09T07:00:00+01:00",
    "2026-11-09T07:30:00+01:00",
    "2026-11-09T08:00:00+01:00",
    "2026-11-09T08:30:00+01:00",
];

interface PassageOptions {
    lineRef: string;
    scheduledDeparture: string;
    expectedDeparture?: string;
    scheduledArrival?: string;
    expectedArrival?: string;
    fresh?: boolean;
    platform?: string;
}

function passage(options: PassageOptions): Departure {
    const expected = options.expectedDeparture ?? options.scheduledDeparture;
    return {
        lineRef: options.lineRef,
        destinationName: "",
        scheduledTime: options.scheduledDeparture,
        expectedTime: expected,
        delaySeconds: 0,
        dataFreshness: options.fresh === false ? "scheduled" : "realtime",
        scheduledArrivalTime: options.scheduledArrival,
        expectedArrivalTime: options.expectedArrival ?? options.scheduledArrival,
        platform: options.platform,
    };
}

const busOnTime = passage({
    lineRef: "C00881",
    scheduledDeparture: "2026-11-09T07:46:00+01:00",
    scheduledArrival: "2026-11-09T07:46:00+01:00",
});
const busTwelveLate = passage({
    lineRef: "C00881",
    scheduledDeparture: "2026-11-09T07:46:00+01:00",
    scheduledArrival: "2026-11-09T07:46:00+01:00",
    expectedArrival: "2026-11-09T07:58:00+01:00",
});
const trainOnTime = passage({ lineRef: "C01731", scheduledDeparture: "2026-11-09T07:55:30+01:00", platform: "2" });

interface Setup {
    passages?: Record<string, Departure[]>;
    siriFails?: boolean;
    headways?: Record<string, string[]>;
    departuresFail?: boolean;
}

function makeService(setup: Setup = {}) {
    const getNextDepartures = vi.fn<DeparturesProvider["getNextDepartures"]>(async (reference) => {
        if (setup.siriFails) {
            throw new Error("panne SIRI");
        }
        return setup.passages?.[reference] ?? [];
    });
    const getScheduledDepartures = vi.fn<TransitRoutingProvider["getScheduledDepartures"]>(async (_stop, routeId) => {
        if (setup.departuresFail) {
            throw new Error("panne calculateur");
        }
        return setup.headways?.[routeId] ?? RARE_DEPARTURES;
    });
    const provider = { getScheduledDepartures } as unknown as TransitRoutingProvider;
    const service = new RoutineConnectionsService({ getNextDepartures }, provider, new InMemoryCacheStore());
    return { service, getNextDepartures, getScheduledDepartures };
}

const AT_0740 = new Date("2026-11-09T06:40:00Z");

describe("RoutineConnectionsService.judge", () => {
    it("donne un verdict par paire de transports qui se suivent", async () => {
        const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busOnTime], [MELUN_REF]: [trainOnTime] } });

        const { connections } = await service.judge(fullTrip, AT_0740);

        expect(connections.map((connection) => [connection.fromSegmentIndex, connection.toSegmentIndex])).toEqual([
            [1, 3],
            [3, 4],
        ]);
        expect(connections[0].stopName).toBe("Melun");
    });

    it("compte la marche entre les deux dans la marge", async () => {
        const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busOnTime], [MELUN_REF]: [trainOnTime] } });

        const { connections } = await service.judge(fullTrip, AT_0740);

        expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "realtime" });
    });

    it("sans correspondance : liste vide et statut normal", async () => {
        const direct: DatedItinerary = { ...fullTrip, legs: [walk(60), rerLeg, walk(60)] };
        const { service, getScheduledDepartures } = makeService();

        const judged = await service.judge(direct, AT_0740);

        expect(judged.connections).toEqual([]);
        expect(judged.firstMissed).toBeNull();
        expect(judged.realtimeStatus).toBe("ok");
        expect(getScheduledDepartures).not.toHaveBeenCalled();
    });

    it("retire une correspondance déjà passée", async () => {
        const { service } = makeService();

        const { connections } = await service.judge(fullTrip, new Date("2026-11-09T07:10:00Z"));

        expect(connections.map((connection) => connection.fromSegmentIndex)).toEqual([3]);
    });

    it("garde une correspondance perdue tant que le bus en retard n'est pas arrivé", async () => {
        const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busTwelveLate], [MELUN_REF]: [trainOnTime] } });

        const { connections } = await service.judge(fullTrip, new Date("2026-11-09T06:56:00Z"));

        expect(connections[0].verdict.kind).toBe("missed");
    });

    it("SIRI en panne : marges prévues, source déclarée indisponible", async () => {
        const { service } = makeService({ siriFails: true });

        const { connections, realtimeStatus, firstMissed } = await service.judge(fullTrip, AT_0740);

        expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
        expect(realtimeStatus).toBe("unavailable");
        expect(firstMissed).toBeNull();
    });

    it("n'interroge SIRI qu'une fois par arrêt", async () => {
        const { service, getNextDepartures } = makeService();

        await service.judge(fullTrip, AT_0740);
        const references = getNextDepartures.mock.calls.map(([reference]) => reference);

        expect(references.filter((reference) => reference === GARE_DE_LYON_REF)).toHaveLength(1);
        expect(new Set(references).size).toBe(references.length);
    });

    describe("véhicule introuvable", () => {
        const laterTrain = passage({ lineRef: "C01731", scheduledDeparture: "2026-11-09T08:25:30+01:00" });

        it("attendu dans 29 min, absent alors que sa ligne publie d'autres passages : inconnue", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busOnTime], [MELUN_REF]: [laterTrain] } });

            const { connections } = await service.judge(fullTrip, new Date("2026-11-09T06:26:30Z"));

            expect(connections[0].verdict).toEqual({ kind: "unknown" });
        });

        it("aucun passage exploitable sur sa ligne, comme le métro sans heure prévue dans SIRI : marge prévue", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [], [MELUN_REF]: [] } });

            const { connections } = await service.judge(fullTrip, new Date("2026-11-09T06:26:30Z"));

            expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
        });

        it("attendu dans 31 min et absent de SIRI : marge prévue", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [] } });

            const { connections } = await service.judge(fullTrip, new Date("2026-11-09T06:14:30Z"));

            expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
        });
    });

    it("un passage de métro sans heure prévue ne ramène pas « inconnue » : la marge reste prévue", async () => {
        const metro: Departure = {
            lineRef: "C01731",
            destinationName: "",
            scheduledTime: null,
            expectedTime: "2026-11-09T07:55:30+01:00",
            delaySeconds: 0,
            dataFreshness: "realtime",
        };
        const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [], [MELUN_REF]: [metro] } });

        const { connections } = await service.judge(fullTrip, new Date("2026-11-09T06:26:30Z"));

        expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
    });

    describe("ligne fréquente", () => {
        const headways = { "route:A": FREQUENT_DEPARTURES };

        it("annonce la fréquence au lieu d'une marge", async () => {
            const { service } = makeService({ headways });

            const { connections } = await service.judge(fullTrip, AT_0740);

            expect(connections[1].verdict).toEqual({ kind: "frequent", headwayMinutes: 5 });
        });

        it("ne devient jamais une correspondance perdue, même avec le train précédent très en retard", async () => {
            const trainVeryLate = passage({
                lineRef: "C01731",
                scheduledDeparture: "2026-11-09T07:55:30+01:00",
                scheduledArrival: "2026-11-09T08:26:00+01:00",
                expectedArrival: "2026-11-09T08:50:00+01:00",
            });
            const { service } = makeService({ headways, passages: { [GARE_DE_LYON_REF]: [trainVeryLate] } });

            const { connections, firstMissed } = await service.judge(fullTrip, AT_0740);

            expect(connections[1].verdict.kind).toBe("frequent");
            expect(firstMissed).toBeNull();
        });

        it("n'appelle les départs prévus qu'une fois pour deux lectures", async () => {
            const { service, getScheduledDepartures } = makeService({ headways });

            await service.judge(fullTrip, AT_0740);
            await service.judge(fullTrip, AT_0740);
            const calledRoutes = getScheduledDepartures.mock.calls.map(([, routeId]) => routeId);

            expect(calledRoutes.filter((routeId) => routeId === "route:A")).toHaveLength(1);
        });

        it("n'interroge pas SIRI pour cette correspondance", async () => {
            const { service, getNextDepartures } = makeService({ headways });

            await service.judge(fullTrip, AT_0740);
            const references = getNextDepartures.mock.calls.map(([reference]) => reference);

            expect(references).not.toContain(GARE_DE_LYON_REF);
        });

        it("départs prévus indisponibles : revient à une marge normale", async () => {
            const { service } = makeService({ departuresFail: true });

            const { connections } = await service.judge(fullTrip, AT_0740);

            expect(connections[1].verdict.kind).not.toBe("frequent");
        });
    });

    describe("correspondance perdue", () => {
        it("le bus frais à +12 min fait perdre le R, marche comprise", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busTwelveLate], [MELUN_REF]: [trainOnTime] } });

            const { firstMissed } = await service.judge(fullTrip, AT_0740);

            expect(firstMissed?.verdict).toEqual({ kind: "missed", missingMinutes: 7, basis: "realtime" });
            expect(firstMissed?.arrivalTime).toBe("2026-11-09T07:58:00+01:00");
            expect(firstMissed?.departureTime).toBe("2026-11-09T07:55:30+01:00");
        });

        it("ne déplace jamais l'heure de départ du trajet", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busTwelveLate], [MELUN_REF]: [trainOnTime] } });

            const { itinerary } = await service.judge(fullTrip, AT_0740);

            expect(itinerary.departureTime).toBe(fullTrip.departureTime);
        });

        it("reporte le retard sur la section concernée", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busTwelveLate], [MELUN_REF]: [trainOnTime] } });

            const { itinerary } = await service.judge(fullTrip, AT_0740);

            expect(itinerary.legs[1].expectedArrivalTime).toBe("2026-11-09T07:58:00+01:00");
            expect(itinerary.legs[1].dataFreshness).toBe("realtime");
        });
    });

    describe("fraîcheur affichée", () => {
        it("ne reprend pas la fraîcheur du plan : sans lecture SIRI fraîche, la section est un horaire prévu", async () => {
            const { service } = makeService();

            const { itinerary } = await service.judge(fullTrip, AT_0740);

            expect(itinerary.legs[1].dataFreshness).toBe("scheduled");
            expect(itinerary.legs[1].expectedArrivalTime).toBe("2026-11-09T07:46:00+01:00");
        });

        it("transmet la voie du train quand SIRI la donne", async () => {
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [busOnTime], [MELUN_REF]: [trainOnTime] } });

            const { itinerary } = await service.judge(fullTrip, AT_0740);

            expect(itinerary.legs[3].platform).toBe("2");
        });

        it("une estimation périmée reste un horaire prévu", async () => {
            const stale = passage({
                lineRef: "C00881",
                scheduledDeparture: "2026-11-09T07:46:00+01:00",
                scheduledArrival: "2026-11-09T07:46:00+01:00",
                fresh: false,
            });
            const staleTrain = passage({ lineRef: "C01731", scheduledDeparture: "2026-11-09T07:55:30+01:00", fresh: false });
            const { service } = makeService({ passages: { [BUS_ARRIVAL_REF]: [stale], [MELUN_REF]: [staleTrain] } });

            const { connections } = await service.judge(fullTrip, AT_0740);

            expect(connections[0].verdict).toEqual({ kind: "holds", marginMinutes: 5, basis: "scheduled" });
        });
    });

    describe("arrivée estimée", () => {
        const AT_0840 = new Date("2026-11-09T07:40:00Z");

        it("sans correspondance restante, lit le dernier arrêt et décale l'arrivée finale", async () => {
            const rerLate = passage({
                lineRef: "C01742",
                scheduledDeparture: "2026-11-09T08:44:29+01:00",
                scheduledArrival: "2026-11-09T08:44:29+01:00",
                expectedArrival: "2026-11-09T08:50:00+01:00",
            });
            const { service } = makeService({ passages: { [LA_DEFENSE_REF]: [rerLate] } });

            const { itinerary } = await service.judge(fullTrip, AT_0840);

            expect(itinerary.arrivalTime).toBe("2026-11-09T08:51:29+01:00");
        });

        it("garde l'arrivée du plan sans donnée fraîche au dernier arrêt", async () => {
            const { service } = makeService();

            const { itinerary } = await service.judge(fullTrip, AT_0840);

            expect(itinerary.arrivalTime).toBe(fullTrip.arrivalTime);
        });

        it("ne lit pas le dernier arrêt tant qu'il reste une correspondance", async () => {
            const { service, getNextDepartures } = makeService();

            await service.judge(fullTrip, AT_0740);
            const references = getNextDepartures.mock.calls.map(([reference]) => reference);

            expect(references).not.toContain(LA_DEFENSE_REF);
        });
    });
});
