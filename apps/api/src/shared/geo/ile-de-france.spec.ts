import { describe, expect, it } from "vitest";
import { ILE_DE_FRANCE_BOUNDS, isInIleDeFrance } from "./ile-de-france";

describe("isInIleDeFrance", () => {
    it("accepte Paris", () => {
        expect(isInIleDeFrance({ latitude: 48.8566, longitude: 2.3522 })).toBe(true);
    });

    it("accepte Dammarie-lès-Lys", () => {
        expect(isInIleDeFrance({ latitude: 48.5244, longitude: 2.6437 })).toBe(true);
    });

    it("refuse Grenoble", () => {
        expect(isInIleDeFrance({ latitude: 45.18, longitude: 5.72 })).toBe(false);
    });

    it("accepte un point exactement sur la limite", () => {
        expect(
            isInIleDeFrance({ latitude: ILE_DE_FRANCE_BOUNDS.minLatitude, longitude: ILE_DE_FRANCE_BOUNDS.maxLongitude }),
        ).toBe(true);
    });
});
