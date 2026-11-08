import { describe, expect, it } from "vitest";
import { LastDepartureDtoInSchema, LastDepartureDtoOutSchema } from "@urbanflow/app-front-back-lib";

describe("LastDepartureDtoInSchema", () => {
    it("accepte une position valide", () => {
        const result = LastDepartureDtoInSchema.safeParse({ position: { latitude: 48.853, longitude: 2.369 } });

        expect(result.success).toBe(true);
    });

    it("refuse une latitude hors bornes", () => {
        const result = LastDepartureDtoInSchema.safeParse({ position: { latitude: 91, longitude: 2.369 } });

        expect(result.success).toBe(false);
    });
});

describe("LastDepartureDtoOutSchema", () => {
    it("refuse un statut inconnu", () => {
        const result = LastDepartureDtoOutSchema.safeParse({
            status: "maybe",
            home: null,
            lastDeparture: null,
            planB: null,
            planBStatus: null,
        });

        expect(result.success).toBe(false);
    });
});
