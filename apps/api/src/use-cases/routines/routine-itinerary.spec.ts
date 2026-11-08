import { describe, expect, it } from "vitest";
import type { LineNotice, TransitItinerary, TransitLeg } from "../transport/transit.providers";
import { applicableNotices, isFarEarlier, latestArrivingBefore, usesExactlyLines } from "./routine-itinerary";

const LINES = ["C00881", "C01731", "C01742"];

function walkLeg(): TransitLeg {
    return { mode: "walk", geometry: { type: "LineString", coordinates: [] }, distanceMeters: 100, durationSeconds: 60 };
}

function transitLeg(lineId: string): TransitLeg {
    return { ...walkLeg(), mode: "train", lineId, lineShortName: lineId };
}

function itineraryOn(lineIds: string[], departureTime?: string, arrivalTime?: string): TransitItinerary {
    return { legs: [walkLeg(), ...lineIds.map(transitLeg), walkLeg()], durationSeconds: 3600, departureTime, arrivalTime };
}

describe("usesExactlyLines", () => {
    it("accepte les mêmes lignes dans le même ordre, marche ignorée", () => {
        expect(usesExactlyLines(itineraryOn(LINES), LINES)).toBe(true);
    });

    it("refuse un trajet qui saute le bus, comme celui renvoyé par Navitia avec 17 min de marche", () => {
        expect(usesExactlyLines(itineraryOn(["C01731", "C01742"]), LINES)).toBe(false);
    });

    it("refuse les mêmes lignes dans un autre ordre", () => {
        expect(usesExactlyLines(itineraryOn(["C01731", "C00881", "C01742"]), LINES)).toBe(false);
    });

    it("refuse une ligne en plus", () => {
        expect(usesExactlyLines(itineraryOn([...LINES, "C01728"]), LINES)).toBe(false);
    });

    it("refuse un trajet à pied, sans ligne", () => {
        expect(usesExactlyLines(itineraryOn([]), LINES)).toBe(false);
    });
});

describe("latestArrivingBefore", () => {
    const limit = new Date("2026-11-09T08:00:00Z");
    const early = itineraryOn(LINES, "2026-11-09T07:27:59+01:00", "2026-11-09T08:36:38+01:00");
    const late = itineraryOn(LINES, "2026-11-09T07:37:59+01:00", "2026-11-09T08:45:58+01:00");
    const tooLate = itineraryOn(LINES, "2026-11-09T07:50:00+01:00", "2026-11-09T09:00:01+01:00");

    it("retient celui qui part le plus tard en arrivant à l'heure", () => {
        expect(latestArrivingBefore([early, late], limit)).toBe(late);
    });

    it("écarte celui qui arrive après la limite, même d'une seconde", () => {
        expect(latestArrivingBefore([early, tooLate], limit)).toBe(early);
    });

    it("accepte une arrivée à l'heure pile", () => {
        const onTime = itineraryOn(LINES, "2026-11-09T07:50:00+01:00", "2026-11-09T09:00:00+01:00");

        expect(latestArrivingBefore([early, onTime], limit)).toBe(onTime);
    });

    it("écarte un trajet sans heures", () => {
        expect(latestArrivingBefore([itineraryOn(LINES)], limit)).toBeNull();
    });

    it("écarte un trajet entièrement à pied", () => {
        const onFoot = itineraryOn([], "2026-11-09T07:50:00+01:00", "2026-11-09T08:50:00+01:00");

        expect(latestArrivingBefore([onFoot], limit)).toBeNull();
    });

    it("ne renvoie rien sans trajet", () => {
        expect(latestArrivingBefore([], limit)).toBeNull();
    });
});

describe("isFarEarlier", () => {
    const usualDeparture = new Date("2026-11-09T06:41:00Z");

    function dated(departureTime: string) {
        return { ...itineraryOn(LINES, departureTime, "2026-11-09T08:45:58+01:00"), departureTime, arrivalTime: "2026-11-09T08:45:58+01:00" };
    }

    it("accepte un départ 30 min plus tôt", () => {
        expect(isFarEarlier(dated("2026-11-09T07:11:00+01:00"), usualDeparture)).toBe(false);
    });

    it("signale un départ 30 min 01 plus tôt", () => {
        expect(isFarEarlier(dated("2026-11-09T07:10:59+01:00"), usualDeparture)).toBe(true);
    });

    it("accepte un départ plus tard que d'habitude", () => {
        expect(isFarEarlier(dated("2026-11-09T07:55:00+01:00"), usualDeparture)).toBe(false);
    });
});

describe("applicableNotices", () => {
    const at = "2026-11-09T08:00:00+01:00";
    const coveringPeriod = { begin: "2026-11-09T04:00:00+01:00", end: "2026-11-10T04:00:00+01:00" };
    const otherPeriod = { begin: "2026-11-16T03:00:00+01:00", end: "2026-11-17T03:00:00+01:00" };

    function notice(overrides: Partial<LineNotice> = {}): LineNotice {
        return { lineId: "C00881", lineShortName: "3601", text: "Travaux", periods: [coveringPeriod], ...overrides };
    }

    it("garde un message de la ligne dont la période couvre l'heure, sans ses identifiants ni ses périodes", () => {
        expect(applicableNotices([notice()], LINES, at)).toEqual([{ lineShortName: "3601", text: "Travaux" }]);
    });

    it("trouve la bonne période parmi plusieurs", () => {
        const periods = [otherPeriod, coveringPeriod];

        expect(applicableNotices([notice({ periods })], LINES, at)).toHaveLength(1);
    });

    it("écarte un message dont aucune période ne couvre l'heure", () => {
        expect(applicableNotices([notice({ periods: [otherPeriod] })], LINES, at)).toEqual([]);
    });

    it("écarte un message sans période", () => {
        expect(applicableNotices([notice({ periods: [] })], LINES, at)).toEqual([]);
    });

    it("écarte un message d'une autre ligne", () => {
        expect(applicableNotices([notice({ lineId: "C01728" })], LINES, at)).toEqual([]);
    });

    it("garde 2 messages au maximum, dans l'ordre reçu", () => {
        const notices = [notice({ text: "Un" }), notice({ text: "Deux" }), notice({ text: "Trois" })];

        expect(applicableNotices(notices, LINES, at).map((kept) => kept.text)).toEqual(["Un", "Deux"]);
    });

    it("n'affiche pas deux fois le même message sur une même ligne", () => {
        const notices = [notice({ text: "Un" }), notice({ text: "Un" }), notice({ text: "Deux" })];

        expect(applicableNotices(notices, LINES, at).map((kept) => kept.text)).toEqual(["Un", "Deux"]);
    });
});
