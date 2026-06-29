import { describe, expect, it, vi } from "vitest";
import { TripPlanningUseCase } from "./trip-planning.use-case";
import type { OrsRoute, OrsRoutingAdapter } from "../../transport/openRouteService-routing.adapter";

function makeOrsRoute(distanceMeters: number, durationSeconds: number): OrsRoute {
    return {
        geometry: { type: "LineString", coordinates: [[5.72, 45.18], [5.73, 45.19]] },
        distanceMeters,
        durationSeconds,
    };
}

function makeUseCase(getRoute: OrsRoutingAdapter["getRoute"]): TripPlanningUseCase {
    const adapter = { getRoute } as unknown as OrsRoutingAdapter;
    return new TripPlanningUseCase(adapter);
}

const origin = { latitude: 45.18, longitude: 5.72 };
const destination = { latitude: 45.19, longitude: 5.73 };

describe("TripPlanningUseCase", () => {
    it("renvoie marche + vélo, carbone zéro", async () => {
        const useCase = makeUseCase(async (profile) =>
            profile === "cycling-regular" ? makeOrsRoute(3000, 600) : makeOrsRoute(2500, 1800),
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.routes).toHaveLength(2);
        const modes = result.routes.flatMap((route) => route.segments.map((segment) => segment.mode));
        expect(modes).toContain("walk");
        expect(modes).toContain("bike");
        expect(result.routes.every((route) => route.totalCarbonGrams === 0)).toBe(true);
    });
    it("classe le plus rapide en premier", async () => {
        const useCase = makeUseCase(async (profile) =>
            profile === "cycling-regular" ? makeOrsRoute(3000, 600) : makeOrsRoute(2500, 1800),
        );

        const result = await useCase.execute({ origin, destination });

        expect(result.routes[0].segments[0].mode).toBe("bike"); // 600s < 1800s
        expect(result.routes[0].score).toBeGreaterThanOrEqual(result.routes[1].score);
    });

    it("passe en profil wheelchair quand wheelchairAccess est vrai (C12)", async () => {
        const getRoute = vi.fn(async () => makeOrsRoute(2000, 1500));
        const useCase = makeUseCase(getRoute);

        await useCase.execute({
            origin,
            destination,
            profile: { weightCarbon: 50, weightTime: 30, weightCost: 20, wheelchairAccess: true },
        });

        const calledProfiles = getRoute.mock.calls.map((call) => call[0]);
        expect(calledProfiles).toContain("wheelchair");
        expect(calledProfiles).not.toContain("foot-walking");
    });
});