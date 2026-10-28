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
});
