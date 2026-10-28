import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapJourney, NavitiaJourneysResponseSchema, type NavitiaJourney } from "./idfm-journeys.mapper";

const fixture = NavitiaJourneysResponseSchema.parse(
    JSON.parse(readFileSync(join(__dirname, "__fixtures__", "journeys.json"), "utf-8")),
);
const [busTrainRerJourney, metroJourney] = fixture.journeys ?? [];

describe("mapJourney", () => {
    it("traduit le trajet bus 3601, R puis RER A", () => {
        const itinerary = mapJourney(busTrainRerJourney);

        expect(itinerary?.legs.map((leg) => leg.mode)).toEqual(["walk", "bus", "walk", "train", "rer", "walk"]);
        expect(itinerary?.legs.map((leg) => leg.lineShortName).filter(Boolean)).toEqual(["3601", "R", "A"]);
        expect(itinerary?.durationSeconds).toBe(busTrainRerJourney.duration);
    });

    it("reprend les couleurs officielles des lignes", () => {
        const transitLegs = mapJourney(busTrainRerJourney)?.legs.filter((leg) => leg.lineShortName) ?? [];

        expect(transitLegs.map((leg) => leg.lineColor)).toEqual(["#FF5A00", "#F49FB3", "#EB2132"]);
    });

    it("donne la fraîcheur section par section", () => {
        const transitLegs = mapJourney(busTrainRerJourney)?.legs.filter((leg) => leg.lineShortName) ?? [];

        expect(transitLegs.map((leg) => leg.dataFreshness)).toEqual(["scheduled", "realtime", "realtime"]);
    });

    it("exprime les heures à l'heure de Paris", () => {
        const busLeg = mapJourney(busTrainRerJourney)?.legs.find((leg) => leg.mode === "bus");

        expect(busLeg?.scheduledDepartureTime).toMatch(/^2026-10-14T\d{2}:\d{2}:\d{2}\+02:00$/);
        expect(busLeg?.expectedDepartureTime).toMatch(/\+02:00$/);
    });

    it("garde la référence SIRI du point d'arrêt de départ du R", () => {
        const trainLeg = mapJourney(busTrainRerJourney)?.legs.find((leg) => leg.mode === "train");

        expect(trainLeg?.departureStopPointRef).toBe("STIF:StopArea:SP:47909:");
        expect(trainLeg?.departureStopName).toBe("Melun");
    });

    it("donne une distance, une géométrie et des arrêts intermédiaires au bus", () => {
        const busLeg = mapJourney(busTrainRerJourney)?.legs.find((leg) => leg.mode === "bus");

        expect(busLeg?.distanceMeters).toBeGreaterThan(0);
        expect(busLeg?.geometry.coordinates.length).toBeGreaterThan(1);
        expect(busLeg?.intermediateStops?.[0]).toEqual(
            expect.objectContaining({ name: expect.any(String), latitude: expect.any(Number), longitude: expect.any(Number) }),
        );
    });

    it("reconnaît le métro", () => {
        expect(mapJourney(metroJourney)?.legs.map((leg) => leg.mode)).toContain("metro");
    });

    it("écarte un itinéraire qui emprunte un mode non pris en charge", () => {
        const journeyWithOrlyval: NavitiaJourney = {
            ...busTrainRerJourney,
            sections: busTrainRerJourney.sections.map((section) =>
                section.display_informations
                    ? { ...section, display_informations: { ...section.display_informations, physical_mode: "Orlyval" } }
                    : section,
            ),
        };

        expect(mapJourney(journeyWithOrlyval)).toBeNull();
    });
});
