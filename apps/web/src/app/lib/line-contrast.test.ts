import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AMBIANCE_GLASS_COLORS, contrastRatio, lineContrast } from "./line-contrast";

describe("contrastRatio", () => {
    it("calcule le contraste WCAG entre deux couleurs", () => {
        expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
        expect(contrastRatio("#EB2132", "#FFFFFF")).toBeCloseTo(4.4, 1);
    });
});

describe("lineContrast", () => {
    it("RER A : code blanc à 4,38:1, donc en 19 px", () => {
        const result = lineContrast("#EB2132", AMBIANCE_GLASS_COLORS.jour);
        expect(result.textColor).toBe("#FFFFFF");
        expect(result.textContrast).toBeCloseTo(4.38, 2);
        expect(result.largeCode).toBe(true);
    });

    it("RER D : aucun code n'atteint 4,5:1, donc code en 19 px (seuil des grands corps à 3:1)", () => {
        const result = lineContrast("#008B5B", AMBIANCE_GLASS_COLORS.jour);
        expect(result.largeCode).toBe(true);
        expect(result.textContrast).toBeGreaterThanOrEqual(3);
    });

    it("bus 3601 : code à l'encre", () => {
        const result = lineContrast("#FF5A00", AMBIANCE_GLASS_COLORS.jour);
        expect(result.textColor).toBe("#0F2238");
        expect(result.largeCode).toBe(false);
    });

    it("ligne R sur le verre de jour : liseré nécessaire", () => {
        expect(lineContrast("#F49FB3", AMBIANCE_GLASS_COLORS.jour).needsOutline).toBe(true);
    });

    it("ligne R sur le verre du crépuscule : pas de liseré", () => {
        expect(lineContrast("#F49FB3", AMBIANCE_GLASS_COLORS.crepuscule).needsOutline).toBe(false);
    });

    it("métro 14 sur le verre de nuit : liseré nécessaire", () => {
        expect(lineContrast("#640082", AMBIANCE_GLASS_COLORS.nuit).needsOutline).toBe(true);
    });
});

describe("AMBIANCE_GLASS_COLORS", () => {
    it("reprend les --uf-glass-opaque de tokens.css", () => {
        const tokens = readFileSync(resolve(__dirname, "../css/tokens.css"), "utf-8");
        for (const [ambiance, color] of Object.entries(AMBIANCE_GLASS_COLORS)) {
            const block = tokens.split(`[data-ambiance="${ambiance}"]`)[1]?.split("}")[0] ?? "";
            expect(block).toContain(`--uf-glass-opaque: ${color};`);
        }
    });
});
