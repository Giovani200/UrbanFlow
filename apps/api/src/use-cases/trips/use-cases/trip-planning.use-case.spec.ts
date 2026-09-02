import { describe, expect, it, vi } from "vitest";
import type { Coordinates, TripMode } from "@urbanflow/app-front-back-lib";
import { TripPlanningUseCase } from "./trip-planning.use-case";
import type { OrsProfile, OrsRoute, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";
import type { OtpItinerary, OtpLeg, OtpRoutingAdapter } from "../../transport/openTripPlanner-routing.adapter";

function makeOrsRoute(distanceMeters: number, durationSeconds: number): OrsRoute {
    return {
        geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
        distanceMeters,
        durationSeconds,
    };
}

function makeOtpLeg(
    mode: TripMode,
    distanceMeters: number,
    durationSeconds: number,
    lineShortName?: string,
): OtpLeg {
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
    getItineraries: OtpRoutingAdapter["getItineraries"] = async () => [],
): TripPlanningUseCase {
    const orsRoutingAdapter = { getRoute } as unknown as OrsRoutingAdapter;
    const otpRoutingAdapter = { getItineraries } as unknown as OtpRoutingAdapter;
    return new TripPlanningUseCase(orsRoutingAdapter, otpRoutingAdapter);
}

const origin = { latitude: 45.18, longitude: 5.72 };
const destination = { latitude: 45.19, longitude: 5.73 };

describe("TripPlanningUseCase", () => {
    it("construit une route transit multi-segments, carbone = somme des legs", async () => {
        const itinerary: OtpItinerary = {
            durationSeconds: 1500,
            legs: [
                makeOtpLeg("walk", 300, 240),
                makeOtpLeg("bus", 2000, 600, "C1"),
                makeOtpLeg("tram", 4000, 480, "B"),
                makeOtpLeg("walk", 200, 180),
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

    it("écarte l'itinéraire OTP tout-marche (doublon d'ORS)", async () => {
        const allWalk: OtpItinerary = {
            durationSeconds: 3000,
            legs: [makeOtpLeg("walk", 5000, 3000)],
        };
        const withBus: OtpItinerary = {
            durationSeconds: 1200,
            legs: [makeOtpLeg("walk", 200, 180), makeOtpLeg("bus", 3000, 800, "C1")],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [allWalk, withBus],
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toHaveLength(1);
        expect(result.transit[0].segments.some((segment) => segment.mode === "bus")).toBe(true);
    });

    it("OTP en échec → transit vide, marche et vélo conservés (allSettled)", async () => {
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => {
                throw new Error("OTP_REQUEST_FAILED");
            },
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.transit).toEqual([]);
        expect(result.walk).not.toBeNull();
        expect(result.bike).not.toBeNull();
    });

    it("profil wheelchair → ORS wheelchair ET OTP wheelchair=true (C12)", async () => {
        const getRoute = vi.fn(async (profile: OrsProfile) => makeOrsRoute(2000, 1500));
        const getItineraries = vi.fn(
            async (requestOrigin: Coordinates, requestDestination: Coordinates, wheelchairAccess: boolean) =>
                [] as OtpItinerary[],
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
        const fast: OtpItinerary = {
            durationSeconds: 900,
            legs: [makeOtpLeg("walk", 100, 90), makeOtpLeg("tram", 4000, 700, "B")],
        };
        const slow: OtpItinerary = {
            durationSeconds: 2400,
            legs: [makeOtpLeg("walk", 100, 90), makeOtpLeg("bus", 6000, 2200, "C1")],
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
        const tram: OtpItinerary = {
            durationSeconds: 900,
            legs: [makeOtpLeg("walk", 100, 90), makeOtpLeg("tram", 4000, 700, "B")],
        };
        const bus: OtpItinerary = {
            durationSeconds: 2400,
            legs: [makeOtpLeg("walk", 100, 90), makeOtpLeg("bus", 6000, 2200, "C1")],
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
        const busLeg: OtpLeg = {
            mode: "bus",
            geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
            distanceMeters: 2000,
            durationSeconds: 600,
            lineShortName: "C1",
            intermediateStops: [{ name: "Arrêt A", latitude: 45.185, longitude: 5.725 }],
        };
        const itinerary: OtpItinerary = {
            durationSeconds: 900,
            legs: [makeOtpLeg("walk", 200, 180), busLeg],
        };
        const useCase = makeUseCase(
            async () => makeOrsRoute(2500, 1800),
            async () => [itinerary],
        );

        const result = await useCase.execute({ origin, destination });

        const busSegment = result.transit[0].segments.find((segment) => segment.mode === "bus");
        expect(busSegment?.intermediateStops).toEqual([{ name: "Arrêt A", latitude: 45.185, longitude: 5.725 }]);
    });

    it("transmet plannedTime à l'adaptateur OTP", async () => {
        const getItineraries = vi.fn(async () => [] as OtpItinerary[]);
        const useCase = makeUseCase(async () => makeOrsRoute(2000, 1500), getItineraries);
        const plannedTime = { dateTime: "2026-08-28T14:00", mode: "departure" as const };

        await useCase.execute({ origin, destination, plannedTime });

        expect(getItineraries).toHaveBeenCalledWith(origin, destination, false, plannedTime);
    });
});
