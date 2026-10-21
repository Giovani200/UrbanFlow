import type { Ambiance } from "@/app/lib/ambiance";

export const MAP_BASE_STYLE = "dataviz";

interface MapPalette {
    background: string;
    residential: string;
    green: string;
    water: string;
    road: string;
    roadOutline: string;
    railway: string;
    building: string;
    label: string;
    labelHalo: string;
}

/** Carte sobre et désaturée, teintée par l'ambiance : les couleurs fortes restent réservées aux lignes. */
const MAP_PALETTES: Record<Ambiance, MapPalette> = {
    aube: {
        background: "#F7EDE6", residential: "#F3E6E2", green: "#E3EBDA", water: "#D9D6F2", road: "#FFFFFF",
        roadOutline: "#E9D9D3", railway: "#C9BDC6", building: "#EEE2DC", label: "#6B5A70", labelHalo: "#F7EDE6",
    },
    jour: {
        background: "#EEF4FA", residential: "#E7EEF6", green: "#DDEBDC", water: "#C9DDF2", road: "#FFFFFF",
        roadOutline: "#D6E1EC", railway: "#B9C6D4", building: "#E2EAF2", label: "#4A5A70", labelHalo: "#EEF4FA",
    },
    crepuscule: {
        background: "#3A2650", residential: "#432C5B", green: "#3B3550", water: "#2C2148", road: "#5C3F72",
        roadOutline: "#4A3260", railway: "#6E5585", building: "#4C3466", label: "#E7C9D4", labelHalo: "#3A2650",
    },
    nuit: {
        background: "#0E1433", residential: "#121A3F", green: "#142038", water: "#0A0F28", road: "#1F2A55",
        roadOutline: "#182248", railway: "#2C3866", building: "#19234A", label: "#9FAAD6", labelHalo: "#0E1433",
    },
};

export interface MapLayerSummary {
    id: string;
    type: string;
}

export interface PaintOperation {
    layerId: string;
    property: string;
    value: string;
}

function paletteKeyFor(layer: MapLayerSummary): keyof MapPalette | null {
    const id = layer.id.toLowerCase();
    if (layer.type === "background") return "background";
    if (id.includes("outline")) return "roadOutline";
    if (id.includes("railway")) return "railway";
    if (id.includes("water") || id === "river") return "water";
    if (id.includes("landcover") || id.includes("forest")) return "green";
    if (id.includes("building")) return "building";
    if (id.includes("residential") || id.includes("stadium") || id.includes("cemetery")) return "residential";
    if (id.includes("road") || id.includes("path") || id.includes("tunnel") || id.includes("bridge") || id.includes("pier")) return "road";
    return null;
}

/** Couleurs à appliquer sur les couches du style de base pour une ambiance donnée. */
export function ambiancePaintOperations(layers: MapLayerSummary[], ambiance: Ambiance): PaintOperation[] {
    const palette = MAP_PALETTES[ambiance];
    return layers.flatMap((layer): PaintOperation[] => {
        if (layer.type === "symbol") {
            return [
                { layerId: layer.id, property: "text-color", value: palette.label },
                { layerId: layer.id, property: "text-halo-color", value: palette.labelHalo },
            ];
        }
        const key = paletteKeyFor(layer);
        if (!key) return [];
        const property = layer.type === "background" ? "background-color" : layer.type === "line" ? "line-color" : layer.type === "fill" ? "fill-color" : null;
        return property ? [{ layerId: layer.id, property, value: palette[key] }] : [];
    });
}
