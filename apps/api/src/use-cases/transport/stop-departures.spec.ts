import type { TransitLine } from "@urbanflow/app-front-back-lib";
import { describe, expect, it } from "vitest";
import { groupStopDepartures } from "./stop-departures";
import type { Departure } from "./transit.providers";

const NOW = new Date("2026-11-09T13:10:00Z");
const BUS: TransitLine = { lineId: "C00881", code: "3601", mode: "bus", color: "#FF5A00", textColor: "#000000" };
const OTHER_BUS: TransitLine = { lineId: "C00882", code: "3604", mode: "bus" };

function passage(lineRef: string, destinationName: string, minutesAfterTwo: number, freshness: Departure["dataFreshness"] = "realtime"): Departure {
    const minutes = String(minutesAfterTwo).padStart(2, "0");
    const time = `2026-11-09T14:${minutes}:00+01:00`;
    return { lineRef, destinationName, scheduledTime: time, expectedTime: time, delaySeconds: 0, dataFreshness: freshness };
}

describe("groupStopDepartures", () => {
    it("fait une ligne par ligne et destination, avec la plaque officielle", () => {
        const rows = groupStopDepartures([passage("C00881", "Melun", 19), passage("C00881", "Chamlys", 24)], [BUS], NOW);

        expect(rows.map((row) => row.destination)).toEqual(["Melun", "Chamlys"]);
        expect(rows[0]).toMatchObject({ lineId: "C00881", lineCode: "3601", mode: "bus", color: "#FF5A00", textColor: "#000000" });
    });

    it("garde 2 heures au plus par ligne, les plus proches, avec leur fraîcheur", () => {
        const rows = groupStopDepartures(
            [passage("C00881", "Melun", 50), passage("C00881", "Melun", 35, "scheduled"), passage("C00881", "Melun", 19)],
            [BUS],
            NOW,
        );

        expect(rows[0].times).toEqual([
            { time: "2026-11-09T14:19:00+01:00", freshness: "realtime" },
            { time: "2026-11-09T14:35:00+01:00", freshness: "scheduled" },
        ]);
    });

    it("garde 4 lignes au plus, celles dont le passage est le plus proche", () => {
        const rows = groupStopDepartures(
            [
                passage("C00881", "E", 50),
                passage("C00881", "A", 11),
                passage("C00881", "B", 12),
                passage("C00881", "C", 13),
                passage("C00881", "D", 14),
            ],
            [BUS],
            NOW,
        );

        expect(rows.map((row) => row.destination)).toEqual(["A", "B", "C", "D"]);
    });

    it("écarte un passage déjà parti", () => {
        const rows = groupStopDepartures([passage("C00881", "Melun", 9), passage("C00881", "Melun", 19)], [BUS], NOW);

        expect(rows[0].times.map((time) => time.time)).toEqual(["2026-11-09T14:19:00+01:00"]);
    });

    it("écarte une ligne qui ne dessert pas cet arrêt selon le référentiel", () => {
        const rows = groupStopDepartures([passage("C09999", "Ailleurs", 19), passage("C00882", "Melun", 20)], [BUS, OTHER_BUS], NOW);

        expect(rows.map((row) => row.lineCode)).toEqual(["3604"]);
    });

    it("garde un métro sans heure prévue, sur son heure estimée", () => {
        const metro: Departure = { ...passage("C00881", "Porte de Clignancourt", 19), scheduledTime: null };

        const rows = groupStopDepartures([metro], [BUS], NOW);

        expect(rows[0].times[0].time).toBe("2026-11-09T14:19:00+01:00");
    });

    it("ne renvoie rien sans passage", () => {
        expect(groupStopDepartures([], [BUS], NOW)).toEqual([]);
    });
});
