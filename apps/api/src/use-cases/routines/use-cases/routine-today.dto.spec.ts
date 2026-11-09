import { describe, expect, it } from "vitest";
import {
    ChooseAlternativeDtoInSchema,
    ConnectionVerdictSchema,
    NotTakenDtoInSchema,
    RoutineTodayDtoOutSchema,
    TripSegmentSchema,
} from "@urbanflow/app-front-back-lib";

const silentToday = {
    status: "none",
    routine: null,
    phase: null,
    route: null,
    connections: [],
    planB: null,
    planBStatus: null,
    alternatives: [],
    alternativesStatus: null,
    notices: [],
    realtimeStatus: null,
    planOrigin: null,
    arrivesLate: false,
    nextRoutine: null,
};

describe("ConnectionVerdictSchema", () => {
    it.each([
        [{ kind: "holds", marginMinutes: 6, basis: "realtime" }],
        [{ kind: "tight", marginMinutes: 0, basis: "scheduled" }],
        [{ kind: "missed", missingMinutes: 3, basis: "realtime" }],
        [{ kind: "frequent", headwayMinutes: 5 }],
        [{ kind: "unknown" }],
    ])("accepte %j", (verdict) => {
        expect(ConnectionVerdictSchema.safeParse(verdict).success).toBe(true);
    });

    it("refuse une correspondance perdue jugée sur les seuls horaires prévus", () => {
        const verdict = { kind: "missed", missingMinutes: 3, basis: "scheduled" };

        expect(ConnectionVerdictSchema.safeParse(verdict).success).toBe(false);
    });

    it("refuse une marge sans origine de la donnée", () => {
        expect(ConnectionVerdictSchema.safeParse({ kind: "holds", marginMinutes: 6 }).success).toBe(false);
    });

    it("refuse un verdict inconnu", () => {
        expect(ConnectionVerdictSchema.safeParse({ kind: "maybe" }).success).toBe(false);
    });
});

describe("RoutineTodayDtoOutSchema", () => {
    it("accepte le silence, sans routine ni trajet", () => {
        expect(RoutineTodayDtoOutSchema.safeParse(silentToday).success).toBe(true);
    });

    it("refuse un statut inconnu", () => {
        expect(RoutineTodayDtoOutSchema.safeParse({ ...silentToday, status: "maybe" }).success).toBe(false);
    });
});

describe("ChooseAlternativeDtoInSchema", () => {
    it.each([0, 1])("accepte la solution %i", (alternativeIndex) => {
        expect(ChooseAlternativeDtoInSchema.safeParse({ routineId: "routine-1", alternativeIndex }).success).toBe(true);
    });

    it("refuse une troisième solution", () => {
        const input = { routineId: "routine-1", alternativeIndex: 2 };

        expect(ChooseAlternativeDtoInSchema.safeParse(input).success).toBe(false);
    });
});

describe("NotTakenDtoInSchema", () => {
    it("accepte une demande sans position", () => {
        expect(NotTakenDtoInSchema.safeParse({ routineId: "routine-1" }).success).toBe(true);
    });

    it("refuse une position hors bornes", () => {
        const input = { routineId: "routine-1", position: { latitude: 91, longitude: 2.4 } };

        expect(NotTakenDtoInSchema.safeParse(input).success).toBe(false);
    });
});

describe("TripSegmentSchema", () => {
    const segment = {
        mode: "bus",
        geometry: { type: "LineString", coordinates: [] },
        durationSeconds: 480,
        distanceMeters: 3000,
        carbonGrams: 366,
        savedGrams: 60,
    };

    it("reste valide sans les nouveaux champs", () => {
        expect(TripSegmentSchema.safeParse(segment).success).toBe(true);
    });

    it("conserve la ligne et les heures d'arrivée", () => {
        const parsed = TripSegmentSchema.parse({
            ...segment,
            lineId: "C00881",
            scheduledArrivalTime: "2026-11-09T07:46:00+01:00",
            expectedArrivalTime: "2026-11-09T07:58:00+01:00",
        });

        expect(parsed.lineId).toBe("C00881");
        expect(parsed.scheduledArrivalTime).toBe("2026-11-09T07:46:00+01:00");
        expect(parsed.expectedArrivalTime).toBe("2026-11-09T07:58:00+01:00");
    });
});
