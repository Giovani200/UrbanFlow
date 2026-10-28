import { describe, expect, it } from "vitest";
import { ambiancePaintOperations } from "./map-ambiance";

const DATAVIZ_LAYERS = [
    { id: "Background", type: "background" },
    { id: "Residential", type: "fill" },
    { id: "Forest", type: "fill" },
    { id: "River", type: "line" },
    { id: "Water", type: "fill" },
    { id: "Road network outline", type: "line" },
    { id: "Road network", type: "line" },
    { id: "Railway", type: "line" },
    { id: "Building", type: "fill" },
    { id: "City labels", type: "symbol" },
    { id: "Country border", type: "line" },
];

function colorOf(ambiance: "jour" | "nuit", layerId: string, property: string): string | undefined {
    return ambiancePaintOperations(DATAVIZ_LAYERS, ambiance).find((operation) => operation.layerId === layerId && operation.property === property)?.value;
}

describe("ambiancePaintOperations", () => {
    it("teinte le fond, l'eau et les routes selon l'ambiance", () => {
        expect(colorOf("jour", "Background", "background-color")).toBe("#EEF4FA");
        expect(colorOf("nuit", "Background", "background-color")).toBe("#0E1433");
        expect(colorOf("nuit", "Water", "fill-color")).toBe("#0A0F28");
        expect(colorOf("nuit", "River", "line-color")).toBe("#0A0F28");
    });

    it("distingue le contour des routes de la route elle-même", () => {
        expect(colorOf("jour", "Road network", "line-color")).toBe("#FFFFFF");
        expect(colorOf("jour", "Road network outline", "line-color")).toBe("#D6E1EC");
    });

    it("règle le texte et son halo pour les libellés", () => {
        expect(colorOf("nuit", "City labels", "text-color")).toBe("#9FAAD6");
        expect(colorOf("nuit", "City labels", "text-halo-color")).toBe("#0E1433");
    });

    it("ne touche pas aux couches non prévues", () => {
        expect(ambiancePaintOperations(DATAVIZ_LAYERS, "jour").some((operation) => operation.layerId === "Country border")).toBe(false);
    });
});
