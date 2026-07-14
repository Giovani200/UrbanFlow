import { describe, expect, it } from "vitest";
import { aggregateCarbon, type CarbonEvent } from "@urbanflow/app-front-back-lib";

// 15 juillet 2026, midi (jour de référence pour les fenêtres de période).
const now = new Date(2026, 6, 15, 12, 0, 0);

function event(overrides: Partial<CarbonEvent> = {}): CarbonEvent {
    return {
        tripId: "t1",
        takenAt: now.toISOString(),
        mode: "tram",
        distanceMeters: 4000,
        carbonGrams: 17.76,
        savedGrams: 550.24,
        ...overrides,
    };
}

describe("aggregateCarbon", () => {
    it("aucun événement → résumé vide, buckets présents, objectif null", () => {
        const summary = aggregateCarbon([], "week", now);

        expect(summary.tripCount).toBe(0);
        expect(summary.totalCarbonGrams).toBe(0);
        expect(summary.totalSavedGrams).toBe(0);
        expect(summary.byMode).toEqual([]);
        expect(summary.goal).toBeNull();
        expect(summary.buckets).toHaveLength(7);
        expect(summary.buckets.every((bucket) => bucket.carbonGrams === 0 && bucket.savedGrams === 0)).toBe(true);
    });

    it("exclut les événements hors de la fenêtre courante", () => {
        const inWindow = event({ tripId: "in" });
        const twoWeeksAgo = event({ tripId: "old", takenAt: new Date(2026, 6, 1, 12).toISOString() });

        const summary = aggregateCarbon([inWindow, twoWeeksAgo], "week", now);

        expect(summary.tripCount).toBe(1);
    });

    it("agrège totaux, référence voiture, économie et répartition par mode", () => {
        const walk = event({ tripId: "a", mode: "walk", distanceMeters: 1000, carbonGrams: 0, savedGrams: 142 });
        const tram = event({ tripId: "a", mode: "tram", distanceMeters: 4000, carbonGrams: 17.76, savedGrams: 550.24 });

        const summary = aggregateCarbon([walk, tram], "week", now);

        expect(summary.tripCount).toBe(1); // même tripId
        expect(summary.totalCarbonGrams).toBeCloseTo(17.76, 5);
        expect(summary.totalSavedGrams).toBeCloseTo(692.24, 5);
        expect(summary.carReferenceGrams).toBeCloseTo(710, 5); // carbone + économisé
        expect(summary.savedPercent).toBeCloseTo((692.24 / 710) * 100, 5);
        expect(summary.equivalentCarKm).toBeCloseTo(5, 5); // (1000 + 4000) / 1000
        expect(summary.byMode.map((entry) => entry.mode).sort()).toEqual(["tram", "walk"]);
        expect(summary.byMode.reduce((total, entry) => total + entry.percent, 0)).toBeCloseTo(100, 5);
    });

    it("un événement alimente exactement un bucket, la somme des buckets = total", () => {
        const summary = aggregateCarbon([event({ carbonGrams: 20, savedGrams: 100 })], "week", now);

        expect(summary.buckets.filter((bucket) => bucket.carbonGrams > 0)).toHaveLength(1);
        expect(summary.buckets.reduce((total, bucket) => total + bucket.carbonGrams, 0)).toBeCloseTo(20, 5);
    });

    it("objectif : progression si fixé, null sinon", () => {
        const saved10kg = event({ carbonGrams: 0, savedGrams: 10000 });

        expect(aggregateCarbon([saved10kg], "month", now, 20).goal).toEqual({
            targetKg: 20,
            achievedKg: 10,
            percent: 50,
        });
        expect(aggregateCarbon([saved10kg], "month", now, null).goal).toBeNull();
    });

    it("objectif dépassé → plafonné à 100%", () => {
        const summary = aggregateCarbon([event({ carbonGrams: 0, savedGrams: 30000 })], "month", now, 20);

        expect(summary.goal?.percent).toBe(100);
    });
});
