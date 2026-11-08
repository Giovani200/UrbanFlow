import { describe, expect, it } from "vitest";
import type { Departure } from "../transport/transit.providers";
import {
    findArrivalPassage,
    findDeparturePassage,
    frequentHeadwayMinutes,
    judgeConnection,
    marginSeconds,
} from "./connection-verdict";

const ARRIVAL = "2026-11-09T07:46:00+01:00";

function judge(departureIso: string, walkSeconds: number, freshness: { arrival?: boolean; departure?: boolean } = {}) {
    return judgeConnection({
        arrival: { time: ARRIVAL, isFresh: freshness.arrival ?? true },
        departure: { time: departureIso, isFresh: freshness.departure ?? true },
        walkSeconds,
    });
}

function passage(lineRef: string, scheduledTime: string, scheduledArrivalTime?: string): Departure {
    return {
        lineRef,
        destinationName: "",
        scheduledTime,
        expectedTime: scheduledTime,
        delaySeconds: 0,
        dataFreshness: "realtime",
        scheduledArrivalTime,
    };
}

describe("marginSeconds", () => {
    it("retire l'arrivée et la marche du départ suivant", () => {
        expect(marginSeconds(ARRIVAL, "2026-11-09T07:55:30+01:00", 259)).toBe(311);
    });

    it("devient négatif quand le suivant part trop tôt", () => {
        expect(marginSeconds("2026-11-09T08:15:00+01:00", "2026-11-09T08:12:00+01:00", 259)).toBe(-439);
    });
});

describe("judgeConnection", () => {
    it("tient à 3 min pile", () => {
        expect(judge("2026-11-09T07:49:00+01:00", 0)).toEqual({ kind: "holds", marginMinutes: 3, basis: "realtime" });
    });

    it("devient serrée à 2 min 59", () => {
        expect(judge("2026-11-09T07:48:59+01:00", 0)).toEqual({ kind: "tight", marginMinutes: 2, basis: "realtime" });
    });

    it("reste serrée à 0 s", () => {
        expect(judge(ARRIVAL, 0)).toEqual({ kind: "tight", marginMinutes: 0, basis: "realtime" });
    });

    it("ne tient plus à -1 s : il manque 1 min", () => {
        expect(judge("2026-11-09T07:45:59+01:00", 0)).toEqual({ kind: "missed", missingMinutes: 1, basis: "realtime" });
    });

    it("arrondit la marge vers le bas : 2 min 50 affiche 2 min", () => {
        expect(judge("2026-11-09T07:48:50+01:00", 0)).toEqual({ kind: "tight", marginMinutes: 2, basis: "realtime" });
    });

    it("compte la marche : bus 07:46, R 07:55:30, 259 s de marche donnent 5 min", () => {
        expect(judge("2026-11-09T07:55:30+01:00", 259)).toEqual({ kind: "holds", marginMinutes: 5, basis: "realtime" });
    });

    it("compte la marche quand ça ne tient pas : 08:15, R à 08:12, 259 s donnent 8 min manquantes", () => {
        const verdict = judgeConnection({
            arrival: { time: "2026-11-09T08:15:00+01:00", isFresh: true },
            departure: { time: "2026-11-09T08:12:00+01:00", isFresh: true },
            walkSeconds: 259,
        });

        expect(verdict).toEqual({ kind: "missed", missingMinutes: 8, basis: "realtime" });
    });

    it("reste en temps réel quand un seul côté est frais", () => {
        expect(judge("2026-11-09T07:55:30+01:00", 0, { departure: false })).toMatchObject({ basis: "realtime" });
        expect(judge("2026-11-09T07:55:30+01:00", 0, { arrival: false })).toMatchObject({ basis: "realtime" });
    });

    it("annonce une marge prévue quand aucun côté n'est frais", () => {
        const verdict = judge("2026-11-09T07:55:30+01:00", 0, { arrival: false, departure: false });

        expect(verdict).toEqual({ kind: "holds", marginMinutes: 9, basis: "scheduled" });
    });

    it("n'annonce jamais une perte sans donnée fraîche", () => {
        const verdict = judge("2026-11-09T07:45:00+01:00", 0, { arrival: false, departure: false });

        expect(verdict).toEqual({ kind: "tight", marginMinutes: 0, basis: "scheduled" });
    });
});

describe("findDeparturePassage", () => {
    const scheduled = "2026-11-09T21:01:01+01:00";
    const close = "2026-11-09T21:01:03+01:00";

    it("distingue deux trains prévus à 2 s d'écart : le plus proche gagne", () => {
        const passages = [passage("C01742", close), passage("C01742", scheduled)];

        expect(findDeparturePassage(passages, "C01742", scheduled)?.scheduledTime).toBe(scheduled);
        expect(findDeparturePassage(passages, "C01742", close)?.scheduledTime).toBe(close);
    });

    it("retient un passage à 60 s pile", () => {
        const passages = [passage("C01742", "2026-11-09T21:02:01+01:00")];

        expect(findDeparturePassage(passages, "C01742", scheduled)).not.toBeNull();
    });

    it("refuse un passage à 61 s", () => {
        const passages = [passage("C01742", "2026-11-09T21:02:02+01:00")];

        expect(findDeparturePassage(passages, "C01742", scheduled)).toBeNull();
    });

    it("ignore une autre ligne à la même heure", () => {
        const passages = [passage("C01731", scheduled)];

        expect(findDeparturePassage(passages, "C01742", scheduled)).toBeNull();
    });

    it("ne trouve rien dans une liste vide", () => {
        expect(findDeparturePassage([], "C01742", scheduled)).toBeNull();
    });
});

describe("findArrivalPassage", () => {
    it("compare l'heure d'arrivée prévue, pas celle du départ : un R arrive à 20:14 et repart à 20:15", () => {
        const passages = [passage("C01731", "2026-11-09T20:15:00+01:00", "2026-11-09T20:14:00+01:00")];

        const found = findArrivalPassage(passages, "C01731", "2026-11-09T20:14:00+01:00");

        expect(found?.scheduledArrivalTime).toBe("2026-11-09T20:14:00+01:00");
    });

    it("distingue deux trains grâce à leur heure d'arrivée", () => {
        const first = passage("C01731", "2026-11-09T20:15:00+01:00", "2026-11-09T20:14:00+01:00");
        const second = passage("C01731", "2026-11-09T20:15:30+01:00", "2026-11-09T20:15:00+01:00");

        const found = findArrivalPassage([first, second], "C01731", "2026-11-09T20:15:00+01:00");

        expect(found).toBe(second);
    });

    it("se rabat sur l'heure du passage quand l'arrivée n'est pas donnée", () => {
        const passages = [passage("C00881", "2026-11-09T07:46:00+01:00")];

        expect(findArrivalPassage(passages, "C00881", "2026-11-09T07:46:00+01:00")).not.toBeNull();
    });
});

describe("frequentHeadwayMinutes", () => {
    it("les vrais départs du RER A à Gare de Lyon donnent un toutes les 5 min", () => {
        const departures = [
            "2026-11-09T08:00:41+01:00",
            "2026-11-09T08:05:21+01:00",
            "2026-11-09T08:07:41+01:00",
            "2026-11-09T08:12:21+01:00",
        ];

        expect(frequentHeadwayMinutes(departures)).toBe(5);
    });

    it("reste fréquente à 7 min pile d'écart", () => {
        const departures = [
            "2026-11-09T08:00:00+01:00",
            "2026-11-09T08:07:00+01:00",
            "2026-11-09T08:14:00+01:00",
            "2026-11-09T08:21:00+01:00",
        ];

        expect(frequentHeadwayMinutes(departures)).toBe(7);
    });

    it("ne l'est plus si un seul écart atteint 7 min 01", () => {
        const departures = [
            "2026-11-09T08:00:00+01:00",
            "2026-11-09T08:02:00+01:00",
            "2026-11-09T08:04:00+01:00",
            "2026-11-09T08:11:01+01:00",
        ];

        expect(frequentHeadwayMinutes(departures)).toBeNull();
    });

    it("ne conclut pas sur moins de 4 départs", () => {
        const departures = ["2026-11-09T08:00:00+01:00", "2026-11-09T08:02:00+01:00", "2026-11-09T08:04:00+01:00"];

        expect(frequentHeadwayMinutes(departures)).toBeNull();
    });
});
