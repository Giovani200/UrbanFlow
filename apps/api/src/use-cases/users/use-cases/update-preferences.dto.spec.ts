import { describe, expect, it } from "vitest";
import { UpdatePreferencesDtoInSchema } from "@urbanflow/app-front-back-lib";

describe("UpdatePreferencesDtoInSchema", () => {
    it("accepte les modes métro, RER et Transilien", () => {
        const result = UpdatePreferencesDtoInSchema.safeParse({ preferredModes: ["metro", "rer", "train"] });

        expect(result.success).toBe(true);
    });

    it("accepte encore la trottinette déjà enregistrée", () => {
        const result = UpdatePreferencesDtoInSchema.safeParse({ preferredModes: ["scooter"] });

        expect(result.success).toBe(true);
    });

    it("refuse un mode inconnu", () => {
        const result = UpdatePreferencesDtoInSchema.safeParse({ preferredModes: ["avion"] });

        expect(result.success).toBe(false);
    });

    it("accepte les réglages du dernier départ à leurs bornes", () => {
        const result = UpdatePreferencesDtoInSchema.safeParse({
            lastDepartureDistanceMeters: 500,
            lastDepartureWindowMinutes: 360,
        });

        expect(result.success).toBe(true);
    });

    it.each([
        { lastDepartureDistanceMeters: 499 },
        { lastDepartureDistanceMeters: 20_001 },
        { lastDepartureWindowMinutes: 29 },
        { lastDepartureWindowMinutes: 361 },
    ])("refuse un réglage du dernier départ hors bornes : %o", (settings) => {
        expect(UpdatePreferencesDtoInSchema.safeParse(settings).success).toBe(false);
    });
});
