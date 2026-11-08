import { describe, expect, it } from "vitest";
import type { TransitItinerary } from "../transport/transit.providers";
import { toTransitTripRoute } from "./trip-route.mapper";

const itinerary: TransitItinerary = {
    durationSeconds: 480,
    legs: [
        {
            mode: "bus",
            geometry: { type: "LineString", coordinates: [] },
            distanceMeters: 3000,
            durationSeconds: 480,
            lineShortName: "3601",
            lineId: "C00881",
            scheduledArrivalTime: "2026-11-09T07:46:00+01:00",
            expectedArrivalTime: "2026-11-09T07:58:00+01:00",
            routeId: "route:IDFM:TRANSDEV_MELUN:4284-RETOUR",
            departureStopPointId: "stop_point:IDFM:31052",
        },
    ],
};

describe("toTransitTripRoute", () => {
    it("transmet au client la ligne et les heures d'arrivée de chaque section", () => {
        const [segment] = toTransitTripRoute(itinerary).segments;

        expect(segment.lineId).toBe("C00881");
        expect(segment.scheduledArrivalTime).toBe("2026-11-09T07:46:00+01:00");
        expect(segment.expectedArrivalTime).toBe("2026-11-09T07:58:00+01:00");
    });

    it("ne transmet pas au client les identifiants internes de Navitia", () => {
        const [segment] = toTransitTripRoute(itinerary).segments;

        expect(segment).not.toHaveProperty("routeId");
        expect(segment).not.toHaveProperty("departureStopPointId");
    });
});
