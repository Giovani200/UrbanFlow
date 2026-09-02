import { describe, expect, it } from "vitest";
import { CalculateCarbonUseCase } from "./calculate-carbon.use-case";

function makeUseCase(): CalculateCarbonUseCase {
    return new CalculateCarbonUseCase();
}

describe("CalculateCarbonUseCase", () => {
    it("trajet voiture : aucune économie vs voiture solo", async () => {
        const result = await makeUseCase().execute({ segments: [{ mode: "car", distanceMeters: 10000 }] });

        expect(result.totalCarbonGrams).toBeCloseTo(10 * 142, 5);
        expect(result.byMode).toHaveLength(1);
        expect(result.byMode[0]).toMatchObject({ mode: "car", percent: 100 });
        expect(result.savedCarbonGrams).toBe(0);
        expect(result.savedPercent).toBe(0);
        expect(result.equivalentCarKilometers).toBe(0);
    });

    it("multimodal : total = somme, répartition par mode, économie vs voiture", async () => {
        const result = await makeUseCase().execute({
            segments: [
                { mode: "walk", distanceMeters: 500 },
                { mode: "bus", distanceMeters: 2000 },
                { mode: "tram", distanceMeters: 4000 },
            ],
        });

        const expectedTotal = (2000 / 1000) * 122 + (4000 / 1000) * 4.28; // marche = 0
        const totalDistanceKilometers = (500 + 2000 + 4000) / 1000;

        expect(result.totalCarbonGrams).toBeCloseTo(expectedTotal, 5);
        expect(result.carReferenceCarbonGrams).toBeCloseTo(totalDistanceKilometers * 142, 5);
        expect(result.savedCarbonGrams).toBeCloseTo(totalDistanceKilometers * 142 - expectedTotal, 5);

        const percentSum = result.byMode.reduce((total, entry) => total + entry.percent, 0);
        expect(percentSum).toBeCloseTo(100, 5);
        expect(result.byMode.find((entry) => entry.mode === "walk")?.carbonGrams).toBe(0);
    });

    it("trajet zéro émission (marche) : économie = 100% de la référence voiture", async () => {
        const result = await makeUseCase().execute({ segments: [{ mode: "walk", distanceMeters: 5000 }] });

        expect(result.totalCarbonGrams).toBe(0);
        expect(result.savedPercent).toBe(100);
        expect(result.equivalentCarKilometers).toBeCloseTo(5, 5); // 5 km de voiture évités
        expect(result.byMode[0]).toMatchObject({ mode: "walk", carbonGrams: 0, percent: 0 });
    });

    it("entrée invalide (segments vide) → rejet (validation Zod)", async () => {
        await expect(makeUseCase().execute({ segments: [] })).rejects.toThrow();
    });
});
