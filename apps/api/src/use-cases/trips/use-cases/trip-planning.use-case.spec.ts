import { describe, expect, it, vi } from "vitest";
import type { Coordinates, TripMode } from "@urbanflow/app-front-back-lib";
import { TripPlanningUseCase } from "./trip-planning.use-case";
import type { OrsProfile, OrsRoute, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";
import type { TransitItinerary, TransitLeg, TransitRoutingProvider } from "../../transport/transit.providers";

function makeOrsRoute(distanceMeters: number, durationSeconds: number): OrsRoute {
    return {
        geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
        distanceMeters,
        durationSeconds,
    };
}

function makeTransitLeg(
    mode: TripMode,
    distanceMeters: number,
    durationSeconds: number,
    lineShortName?: string,
): TransitLeg {
    return {
        mode,
        geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
        distanceMeters,
        durationSeconds,
        lineShortName,
    };
}

function makeUseCase(
    getRoute: OrsRoutingAdapter["getRoute"],
    getItineraries: TransitRoutingProvider["getItineraries"] = async () => [],
): TripPlanningUseCase {
    const orsRoutingAdapter = { getRoute } as unknown as OrsRoutingAdapter;
    const transitRoutingProvider: TransitRoutingProvider = { getItineraries };
    return new TripPlanningUseCase(orsRoutingAdapter, transitRoutingProvider);
}

const origin = { latitude: 48.8566, longitude: 2.3522 };
const destination = { latitude: 48.892, longitude: 2.238 };

describe("TripPlanningUseCase", () => {
    it("construit une route transit multi-segments, carbone = somme des legs", async () => {
        const itinerary: TransitItinerary = {
            durationSeconds: 1500,
            legs: [
                makeTransitLeg("walk", 300, 240),
                makeTransitLeg("bus", 2000, 600, "C1"),
                makeTransitLeg("tram", 4000, 480, "B"),
                makeTransitLeg("walk", 200, 180),
            ],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [itinerary],
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toHaveLength(1);
        const route = result.transit[0];
        expect(route.segments.map((segment) => segment.mode)).toEqual(["walk", "bus", "tram", "walk"]);
        // carbone = bus 2 km × 122 + tram 4 km × 4,28 (marche = 0)
        const expectedCarbon = (2000 / 1000) * 122 + (4000 / 1000) * 4.28;
        expect(route.totalCarbonGrams).toBeCloseTo(expectedCarbon, 5);
        expect(route.totalDistanceMeters).toBe(6500);
        expect(route.totalDurationSeconds).toBe(1500);
        // les modes purs restent disponibles
        expect(result.walk).not.toBeNull();
        expect(result.bike).not.toBeNull();
    });

    it("écarte l'itinéraire tout à pied (doublon d'ORS)", async () => {
        const allWalk: TransitItinerary = {
            durationSeconds: 3000,
            legs: [makeTransitLeg("walk", 5000, 3000)],
        };
        const withBus: TransitItinerary = {
            durationSeconds: 1200,
            legs: [makeTransitLeg("walk", 200, 180), makeTransitLeg("bus", 3000, 800, "C1")],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [allWalk, withBus],
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toHaveLength(1);
        expect(result.transit[0].segments.some((segment) => segment.mode === "bus")).toBe(true);
    });

    it("transport en échec → transit vide, unavailable, marche et vélo conservés", async () => {
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => {
                throw new Error("IDFM_JOURNEYS_FAILED");
            },
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toEqual([]);
        expect(result.transitStatus).toBe("unavailable");
        expect(result.walk).not.toBeNull();
        expect(result.bike).not.toBeNull();
    });

    it("profil fauteuil → ORS wheelchair et option fauteuil transmise au transport", async () => {
        const getRoute = vi.fn(async (profile: OrsProfile) => makeOrsRoute(2000, 1500));
        const getItineraries = vi.fn(
            async (requestOrigin: Coordinates, requestDestination: Coordinates, wheelchairAccess: boolean) =>
                [] as TransitItinerary[],
        );
        const useCase = makeUseCase(getRoute, getItineraries);

        await useCase.execute({
            origin,
            destination,
            profile: { weightCarbon: 50, weightTime: 30, wheelchairAccess: true },
        });

        const orsProfiles = getRoute.mock.calls.map((call) => call[0]);
        expect(orsProfiles).toContain("wheelchair");
        expect(orsProfiles).not.toContain("foot-walking");
        expect(getItineraries).toHaveBeenCalledWith(origin, destination, true, undefined);
    });

    it("classe les options transit par score décroissant", async () => {
        const fast: TransitItinerary = {
            durationSeconds: 900,
            legs: [makeTransitLeg("walk", 100, 90), makeTransitLeg("tram", 4000, 700, "B")],
        };
        const slow: TransitItinerary = {
            durationSeconds: 2400,
            legs: [makeTransitLeg("walk", 100, 90), makeTransitLeg("bus", 6000, 2200, "C1")],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [slow, fast],
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toHaveLength(2);
        expect(result.transit[0].score).toBeGreaterThanOrEqual(result.transit[1].score);
        // l'option tram (rapide + plus propre) doit ressortir en tête
        expect(result.transit[0].segments.some((segment) => segment.mode === "tram")).toBe(true);
    });

    it("preferredModes booste le score de l'itinéraire du mode préféré", async () => {
        const tram: TransitItinerary = {
            durationSeconds: 900,
            legs: [makeTransitLeg("walk", 100, 90), makeTransitLeg("tram", 4000, 700, "B")],
        };
        const bus: TransitItinerary = {
            durationSeconds: 2400,
            legs: [makeTransitLeg("walk", 100, 90), makeTransitLeg("bus", 6000, 2200, "C1")],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [tram, bus],
        );

        const sans = await useCase.execute({ origin, destination });
        const avec = await useCase.execute({
            origin,
            destination,
            profile: { weightCarbon: 50, weightTime: 30, wheelchairAccess: false, preferredModes: ["bus"] },
        });

        const busSans = sans.transit.find((route) => route.segments.some((segment) => segment.mode === "bus"));
        const busAvec = avec.transit.find((route) => route.segments.some((segment) => segment.mode === "bus"));
        expect(busSans).toBeDefined();
        expect(busAvec).toBeDefined();
        expect(busAvec!.score).toBeGreaterThan(busSans!.score);
    });

    it("recopie les arrêts intermédiaires du leg transit sur le segment", async () => {
        const busLeg: TransitLeg = {
            mode: "bus",
            geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
            distanceMeters: 2000,
            durationSeconds: 600,
            lineShortName: "C1",
            intermediateStops: [{ name: "Arrêt A", latitude: 45.185, longitude: 5.725 }],
        };
        const itinerary: TransitItinerary = {
            durationSeconds: 900,
            legs: [makeTransitLeg("walk", 200, 180), busLeg],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [itinerary],
        );

        const result = await useCase.execute({ origin, destination });

        const busSegment = result.transit[0].segments.find((segment) => segment.mode === "bus");
        expect(busSegment?.intermediateStops).toEqual([{ name: "Arrêt A", latitude: 45.185, longitude: 5.725 }]);
    });

    it("transmet plannedTime au fournisseur de transport", async () => {
        const getItineraries = vi.fn(async () => [] as TransitItinerary[]);
        const useCase = makeUseCase(async () => makeOrsRoute(2000, 1500), getItineraries);
        const plannedTime = { dateTime: "2026-08-28T14:00", mode: "departure" as const };

        await useCase.execute({ origin, destination, plannedTime });

        expect(getItineraries).toHaveBeenCalledWith(origin, destination, false, plannedTime);
    });

    it("transitStatus vaut ok quand au moins un itinéraire en transport est trouvé", async () => {
        const itinerary: TransitItinerary = {
            durationSeconds: 900,
            legs: [makeTransitLeg("walk", 200, 180), makeTransitLeg("rer", 8000, 600, "A")],
        };
        const useCase = makeUseCase(async () => makeOrsRoute(2500, 1800), async () => [itinerary]);

        const result = await useCase.execute({ origin, destination });

        expect(result.transitStatus).toBe("ok");
    });

    it("transitStatus vaut no_result quand le fournisseur ne trouve rien", async () => {
        const useCase = makeUseCase(async () => makeOrsRoute(2500, 1800), async () => []);

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toEqual([]);
        expect(result.transitStatus).toBe("no_result");
    });

    it("n'appelle pas le transport pour un départ hors d'Île-de-France", async () => {
        const getItineraries = vi.fn(async () => [] as TransitItinerary[]);
        const useCase = makeUseCase(async () => makeOrsRoute(2500, 1800), getItineraries);

        const result = await useCase.execute({ origin: { latitude: 45.18, longitude: 5.72 }, destination });

        expect(getItineraries).not.toHaveBeenCalled();
        expect(result.transitStatus).toBe("no_result");
        expect(result.walk).not.toBeNull();
    });

    it("recopie la fraîcheur, les heures et les références d'arrêt sur le segment", async () => {
        const trainLeg: TransitLeg = {
            ...makeTransitLeg("train", 40000, 1800, "R"),
            dataFreshness: "realtime",
            scheduledDepartureTime: "2026-10-14T11:14:00+02:00",
            expectedDepartureTime: "2026-10-14T11:15:00+02:00",
            departureStopPointRef: "STIF:StopArea:SP:47909:",
            arrivalStopPointRef: "STIF:StopArea:SP:470195:",
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [{ durationSeconds: 1800, legs: [trainLeg] }],
        );

        const result = await useCase.execute({ origin, destination });
        const trainSegment = result.transit[0].segments[0];

        expect(trainSegment).toEqual(
            expect.objectContaining({
                dataFreshness: "realtime",
                scheduledDepartureTime: "2026-10-14T11:14:00+02:00",
                expectedDepartureTime: "2026-10-14T11:15:00+02:00",
                departureStopPointRef: "STIF:StopArea:SP:47909:",
                arrivalStopPointRef: "STIF:StopArea:SP:470195:",
            }),
        );
        expect(trainSegment.carbonGrams).toBeCloseTo(40 * 9.78, 5);
    });
});
