import { describe, expect, it } from "vitest";
import { expirationTime, isPurgeable, shareStateAt } from "./share-state";

const estimatedArrivalAt = new Date("2026-11-13T23:50:00Z");

function minutesAfterArrival(minutes: number): Date {
    return new Date(estimatedArrivalAt.getTime() + minutes * 60_000);
}

describe("shareStateAt", () => {
    it.each([
        { minutes: -30, expected: "in_progress" },
        { minutes: 9, expected: "in_progress" },
        { minutes: 10, expected: "arrival_unconfirmed" },
        { minutes: 59, expected: "arrival_unconfirmed" },
        { minutes: 60, expected: "expired" },
    ])("partage actif, $minutes min après l'arrivée estimée : $expected", ({ minutes, expected }) => {
        expect(shareStateAt({ endReason: null, estimatedArrivalAt, now: minutesAfterArrival(minutes) })).toBe(expected);
    });

    it.each([
        { endReason: "ARRIVED", expected: "arrived" },
        { endReason: "STOPPED", expected: "stopped" },
        { endReason: "EXPIRED", expected: "expired" },
    ] as const)("partage terminé ($endReason) : $expected, quelle que soit l'heure", ({ endReason, expected }) => {
        expect(shareStateAt({ endReason, estimatedArrivalAt, now: minutesAfterArrival(-30) })).toBe(expected);
    });

    it("raisonne en instants, pas en heure d'horloge, au passage à l'heure d'hiver", () => {
        const arrivalBeforeChange = new Date("2026-10-25T02:55:00+02:00");
        const nowAfterChange = new Date("2026-10-25T02:10:00+01:00");

        expect(shareStateAt({ endReason: null, estimatedArrivalAt: arrivalBeforeChange, now: nowAfterChange })).toBe(
            "arrival_unconfirmed",
        );
    });
});

describe("expirationTime", () => {
    it("tombe 1 h après l'arrivée estimée", () => {
        expect(expirationTime(estimatedArrivalAt)).toEqual(minutesAfterArrival(60));
    });
});

describe("isPurgeable", () => {
    const endedAt = new Date("2026-11-14T00:10:00Z");

    it("garde un partage terminé moins de 12 h", () => {
        const now = new Date(endedAt.getTime() + 12 * 3_600_000 - 1);

        expect(isPurgeable({ endedAt, estimatedArrivalAt: null, now })).toBe(false);
    });

    it("purge un partage terminé depuis 12 h", () => {
        const now = new Date(endedAt.getTime() + 12 * 3_600_000);

        expect(isPurgeable({ endedAt, estimatedArrivalAt: null, now })).toBe(true);
    });

    it("compte les 12 h depuis l'expiration quand elle n'a pas encore été enregistrée", () => {
        const expiredAt = expirationTime(estimatedArrivalAt);

        expect(isPurgeable({ endedAt: null, estimatedArrivalAt, now: new Date(expiredAt.getTime() + 11 * 3_600_000) })).toBe(false);
        expect(isPurgeable({ endedAt: null, estimatedArrivalAt, now: new Date(expiredAt.getTime() + 12 * 3_600_000) })).toBe(true);
    });

    it("ne purge jamais un partage actif sans arrivée estimée", () => {
        expect(isPurgeable({ endedAt: null, estimatedArrivalAt: null, now: new Date("2030-01-01T00:00:00Z") })).toBe(false);
    });
});