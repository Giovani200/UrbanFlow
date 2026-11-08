import { describe, expect, it } from "vitest";
import {
    navitiaLocalToParisIso,
    parisDayKey,
    serviceDayArrivalLimit,
    toNavitiaDateTime,
    toParisLocalMinute,
    utcToParisIso,
} from "./paris-time";

describe("navitiaLocalToParisIso", () => {
    it("ajoute le décalage d'été", () => {
        expect(navitiaLocalToParisIso("20261014T104658")).toBe("2026-10-14T10:46:58+02:00");
    });

    it("ajoute le décalage d'hiver après le changement d'heure", () => {
        expect(navitiaLocalToParisIso("20261026T120000")).toBe("2026-10-26T12:00:00+01:00");
    });

    it("refuse un format invalide", () => {
        expect(() => navitiaLocalToParisIso("2026-10-14")).toThrow();
    });
});

describe("utcToParisIso", () => {
    it("convertit une heure UTC en heure de Paris", () => {
        expect(utcToParisIso("2026-10-14T09:31:00.000Z")).toBe("2026-10-14T11:31:00+02:00");
    });

    it("distingue les deux 02:30 de la nuit du changement d'heure", () => {
        expect(utcToParisIso("2026-10-25T00:30:00.000Z")).toBe("2026-10-25T02:30:00+02:00");
        expect(utcToParisIso("2026-10-25T01:30:00.000Z")).toBe("2026-10-25T02:30:00+01:00");
    });
});

describe("toNavitiaDateTime", () => {
    it("formate une heure locale saisie pour Navitia", () => {
        expect(toNavitiaDateTime("2026-10-14T08:05")).toBe("20261014T080500");
    });
});

describe("parisDayKey", () => {
    it("donne le jour à Paris, déjà le lendemain après 22 h UTC en été", () => {
        expect(parisDayKey(new Date("2026-10-14T22:30:00Z"))).toBe("2026-10-15");
    });

    it("donne le même jour en milieu de journée", () => {
        expect(parisDayKey(new Date("2026-10-14T10:00:00Z"))).toBe("2026-10-14");
    });
});

describe("toParisLocalMinute", () => {
    it("donne l'heure locale d'hiver à la minute", () => {
        expect(toParisLocalMinute(new Date("2026-11-03T22:09:30Z"))).toBe("2026-11-03T23:09");
    });
});

describe("serviceDayArrivalLimit", () => {
    it("le soir, la limite est le lendemain à 04:00", () => {
        expect(serviceDayArrivalLimit(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-04T04:00");
    });

    it("après minuit, la soirée continue : la limite est le jour même à 04:00", () => {
        expect(serviceDayArrivalLimit(new Date("2026-11-04T00:30:00Z"))).toBe("2026-11-04T04:00");
    });

    it("à 04:00 pile, une nouvelle journée de service commence", () => {
        expect(serviceDayArrivalLimit(new Date("2026-11-04T03:00:00Z"))).toBe("2026-11-05T04:00");
    });

    it("la nuit du changement d'heure, 02:30 heure d'hiver reste sur la même soirée", () => {
        expect(serviceDayArrivalLimit(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25T04:00");
    });

    it("en fin de mois, passe au mois suivant", () => {
        expect(serviceDayArrivalLimit(new Date("2026-10-31T21:00:00Z"))).toBe("2026-11-01T04:00");
    });
});
