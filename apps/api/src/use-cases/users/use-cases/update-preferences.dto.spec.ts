import { describe, expect, it } from "vitest";
import { UpdatePreferencesDtoInSchema } from "@urbanflow/app-front-back-lib";

describe("UpdatePreferencesDtoInSchema", () => {
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
