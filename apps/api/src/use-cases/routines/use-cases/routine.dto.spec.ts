import { describe, expect, it } from "vitest";
import { CreateRoutineDtoInSchema, ROUTINE_RULES, UpdateRoutineDtoInSchema } from "@urbanflow/app-front-back-lib";

const validRoutine = {
    name: "Travail",
    origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
    destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
    arrivalTime: "09:00",
    usualDepartureTime: "07:41",
    weekdays: [1, 2, 3, 4, 5],
    lineIds: ["C00881", "C01731", "C01742"],
};

function isCreateValid(overrides: Record<string, unknown>): boolean {
    return CreateRoutineDtoInSchema.safeParse({ ...validRoutine, ...overrides }).success;
}

describe("CreateRoutineDtoInSchema", () => {
    it("accepte une routine complète", () => {
        expect(isCreateValid({})).toBe(true);
    });

    it.each(["7:41", "24:00", "07:60", "0741"])("refuse l'heure d'arrivée %s", (arrivalTime) => {
        expect(isCreateValid({ arrivalTime })).toBe(false);
    });

    it("refuse une heure de départ habituelle invalide", () => {
        expect(isCreateValid({ usualDepartureTime: "25:00" })).toBe(false);
    });

    it.each([[[]], [[0]], [[8]], [[1, 1]], [[1.5]]])("refuse les jours %j", (weekdays) => {
        expect(isCreateValid({ weekdays })).toBe(false);
    });

    it("accepte le dimanche, numéroté 7", () => {
        expect(isCreateValid({ weekdays: [7] })).toBe(true);
    });

    it("refuse une routine sans ligne", () => {
        expect(isCreateValid({ lineIds: [] })).toBe(false);
    });

    it.each(["line:IDFM:C01731", "C 01731", "C".repeat(21)])("refuse l'identifiant de ligne %s", (lineId) => {
        expect(isCreateValid({ lineIds: [lineId] })).toBe(false);
    });

    it("refuse un nom vide après suppression des espaces", () => {
        expect(isCreateValid({ name: "   " })).toBe(false);
    });

    it("accepte un nom à la longueur maximale et refuse un caractère de plus", () => {
        expect(isCreateValid({ name: "a".repeat(ROUTINE_RULES.nameMaxLength) })).toBe(true);
        expect(isCreateValid({ name: "a".repeat(ROUTINE_RULES.nameMaxLength + 1) })).toBe(false);
    });

    it("retire les espaces autour du nom", () => {
        const routine = CreateRoutineDtoInSchema.parse({ ...validRoutine, name: "  Travail  " });

        expect(routine.name).toBe("Travail");
    });

    it("refuse des coordonnées hors bornes", () => {
        const origin = { ...validRoutine.origin, latitude: 91 };

        expect(isCreateValid({ origin })).toBe(false);
    });
});

describe("UpdateRoutineDtoInSchema", () => {
    it("exige l'identifiant de la routine", () => {
        expect(UpdateRoutineDtoInSchema.safeParse(validRoutine).success).toBe(false);
        expect(UpdateRoutineDtoInSchema.safeParse({ ...validRoutine, id: "routine-1" }).success).toBe(true);
    });
});

describe("ROUTINE_RULES", () => {
    it("limite à 5 routines par compte", () => {
        expect(ROUTINE_RULES.maxPerAccount).toBe(5);
    });
});
