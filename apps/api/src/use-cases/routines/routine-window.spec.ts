import { describe, expect, it } from "vitest";
import { parisInstant, parisServiceDay } from "../../shared/time/paris-time";
import { chooseActiveRoutine, isRoutineDay, isWithinWindow, nextRoutineOccurrence } from "./routine-window";

const WEEKDAYS = [1, 2, 3, 4, 5];
const MONDAY = "2026-11-09";
const SUNDAY = "2026-11-08";

describe("isRoutineDay", () => {
    it("accepte un jour choisi", () => {
        expect(isRoutineDay(WEEKDAYS, MONDAY)).toBe(true);
    });

    it("refuse un jour non choisi", () => {
        expect(isRoutineDay(WEEKDAYS, SUNDAY)).toBe(false);
    });

    it("le samedi à 00:15, une routine du vendredi soir est encore du jour", () => {
        const serviceDay = parisServiceDay(new Date("2026-11-06T23:15:00Z"));

        expect(isRoutineDay([5], serviceDay)).toBe(true);
        expect(isRoutineDay([6], serviceDay)).toBe(false);
    });
});

describe("isWithinWindow", () => {
    const usualDeparture = parisInstant(MONDAY, "07:41");
    const closesAt = parisInstant(MONDAY, "09:00");

    it("reste fermé jusqu'à 1 h avant le départ", () => {
        expect(isWithinWindow(usualDeparture, closesAt, new Date("2026-11-09T05:40:59Z"))).toBe(false);
    });

    it("ouvre à 1 h pile avant le départ", () => {
        expect(isWithinWindow(usualDeparture, closesAt, new Date("2026-11-09T05:41:00Z"))).toBe(true);
    });

    it("reste ouvert après le départ", () => {
        expect(isWithinWindow(usualDeparture, closesAt, new Date("2026-11-09T07:52:00Z"))).toBe(true);
    });

    it("reste ouvert à l'heure de fermeture, et se ferme juste après", () => {
        expect(isWithinWindow(usualDeparture, closesAt, closesAt)).toBe(true);
        expect(isWithinWindow(usualDeparture, closesAt, new Date(closesAt.getTime() + 1000))).toBe(false);
    });

    it("ouvre à la bonne heure de chaque côté du changement d'heure", () => {
        const summerDeparture = parisInstant("2026-10-24", "07:41");
        const winterDeparture = parisInstant("2026-10-25", "07:41");
        const summerClose = parisInstant("2026-10-24", "09:00");
        const winterClose = parisInstant("2026-10-25", "09:00");

        expect(isWithinWindow(summerDeparture, summerClose, new Date("2026-10-24T04:40:59Z"))).toBe(false);
        expect(isWithinWindow(summerDeparture, summerClose, new Date("2026-10-24T04:41:00Z"))).toBe(true);
        expect(isWithinWindow(winterDeparture, winterClose, new Date("2026-10-25T05:40:59Z"))).toBe(false);
        expect(isWithinWindow(winterDeparture, winterClose, new Date("2026-10-25T05:41:00Z"))).toBe(true);
    });

    it("gère une routine de nuit, départ 23:30, arrivée 00:30", () => {
        const departure = parisInstant("2026-11-06", "23:30");
        const close = parisInstant("2026-11-06", "00:30");

        expect(isWithinWindow(departure, close, new Date("2026-11-06T23:15:00Z"))).toBe(true);
    });
});

describe("nextRoutineOccurrence", () => {
    const work = { name: "Travail", weekdays: WEEKDAYS, usualDepartureTime: "07:41" };

    it("prend le jour même si le créneau n'est pas encore ouvert", () => {
        const next = nextRoutineOccurrence([work], new Date("2026-11-09T05:00:00Z"));

        expect(next?.departure.toISOString()).toBe("2026-11-09T06:41:00.000Z");
    });

    it("passe au lendemain quand le créneau du jour est déjà ouvert", () => {
        const next = nextRoutineOccurrence([work], new Date("2026-11-09T05:41:01Z"));

        expect(next?.departure.toISOString()).toBe("2026-11-10T06:41:00.000Z");
    });

    it("le vendredi après le départ, annonce le lundi", () => {
        const next = nextRoutineOccurrence([work], new Date("2026-11-13T09:00:00Z"));

        expect(next?.departure.toISOString()).toBe("2026-11-16T06:41:00.000Z");
    });

    it("garde la routine dont le créneau s'ouvre le plus tôt", () => {
        const sport = { name: "Sport", weekdays: WEEKDAYS, usualDepartureTime: "18:00" };

        const next = nextRoutineOccurrence([sport, work], new Date("2026-11-09T05:00:00Z"));

        expect(next?.routine).toBe(work);
    });

    it("rattache une routine de nuit à sa soirée : vendredi 00:30 tombe le samedi au calendrier", () => {
        const night = { name: "Retour", weekdays: [5], usualDepartureTime: "00:30" };

        const next = nextRoutineOccurrence([night], new Date("2026-11-06T21:00:00Z"));

        expect(next?.departure.toISOString()).toBe("2026-11-06T23:30:00.000Z");
    });

    it("reste juste au changement d'heure", () => {
        const sunday = { name: "Dimanche", weekdays: [7], usualDepartureTime: "07:41" };

        const next = nextRoutineOccurrence([sunday], new Date("2026-10-24T12:00:00Z"));

        expect(next?.departure.toISOString()).toBe("2026-10-25T06:41:00.000Z");
    });

    it("ne renvoie rien sans routine", () => {
        expect(nextRoutineOccurrence([], new Date("2026-11-09T05:00:00Z"))).toBeNull();
    });
});

describe("chooseActiveRoutine", () => {
    const now = new Date("2026-11-09T07:00:00Z");
    const begun = { name: "commencée", departure: new Date("2026-11-09T06:30:00Z") };
    const justBegun = { name: "à peine commencée", departure: new Date("2026-11-09T06:55:00Z") };
    const soon = { name: "bientôt", departure: new Date("2026-11-09T07:10:00Z") };
    const later = { name: "plus tard", departure: new Date("2026-11-09T07:45:00Z") };

    it("préfère une routine commencée à une routine à venir, même plus proche", () => {
        expect(chooseActiveRoutine([soon, begun], now)).toBe(begun);
    });

    it("entre deux routines à venir, prend le départ le plus proche", () => {
        expect(chooseActiveRoutine([later, soon], now)).toBe(soon);
    });

    it("entre deux routines commencées, prend le départ le plus récent", () => {
        expect(chooseActiveRoutine([begun, justBegun], now)).toBe(justBegun);
    });

    it("compte comme commencée une routine dont le départ est à l'instant même", () => {
        const startingNow = { name: "maintenant", departure: now };

        expect(chooseActiveRoutine([soon, startingNow], now)).toBe(startingNow);
    });

    it("ne renvoie rien sans routine", () => {
        expect(chooseActiveRoutine([], now)).toBeNull();
    });
});
