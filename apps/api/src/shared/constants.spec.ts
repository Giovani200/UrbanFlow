import { describe, expect, it } from "vitest";
import { TripModeSchema } from "@urbanflow/app-front-back-lib";
import { CARBON_FACTORS } from "./constants";

describe("CARBON_FACTORS", () => {
    it("a un facteur numérique pour chaque mode de trajet", () => {
        for (const mode of TripModeSchema.options) {
            expect(typeof CARBON_FACTORS[mode]).toBe("number");
        }
    });

    it("reprend les facteurs ADEME fabrication incluse relevés le 14/10/2026", () => {
        expect(CARBON_FACTORS.metro).toBe(4.44);
        expect(CARBON_FACTORS.rer).toBe(9.78);
        expect(CARBON_FACTORS.train).toBe(9.78);
        expect(CARBON_FACTORS.ter).toBe(27.69);
    });

    it("conserve les facteurs déjà en place", () => {
        expect(CARBON_FACTORS.car).toBe(142);
        expect(CARBON_FACTORS.bus).toBe(122);
        expect(CARBON_FACTORS.tram).toBe(4.28);
    });
});
