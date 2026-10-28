import type { Ambiance } from "./ambiance";

const PLATE_INK = "#0F2238";
const PLATE_WHITE = "#FFFFFF";
const NORMAL_TEXT_MINIMUM = 4.5;
const GRAPHIC_MINIMUM = 3;

/** Verre de référence de chaque ambiance (`--uf-glass-opaque` de tokens.css), pour juger le contraste d'un tracé. */
export const AMBIANCE_GLASS_COLORS: Record<Ambiance, string> = {
    aube: "#FBF1F5",
    jour: "#F3F8FF",
    crepuscule: "#2C1640",
    nuit: "#141A45",
};

function channelLuminance(channel: number): number {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor: string): number {
    const hex = hexColor.replace("#", "");
    const [red, green, blue] = [0, 2, 4].map((offset) => channelLuminance(parseInt(hex.slice(offset, offset + 2), 16)));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Contraste WCAG 2.1 entre deux couleurs hexadécimales (#RRGGBB). */
export function contrastRatio(firstColor: string, secondColor: string): number {
    const [lighter, darker] = [relativeLuminance(firstColor), relativeLuminance(secondColor)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

export interface LineContrast {
    textColor: typeof PLATE_INK | typeof PLATE_WHITE;
    textContrast: number;
    largeCode: boolean;
    needsOutline: boolean;
}

/**
 * Règles du design system pour une couleur de ligne : code de la plaque dans la couleur qui contraste le plus,
 * code en grand corps (19 px) si aucune n'atteint 4,5:1, liseré si le tracé passe sous 3:1 face au verre.
 */
export function lineContrast(lineColor: string, glassColor: string): LineContrast {
    const inkContrast = contrastRatio(lineColor, PLATE_INK);
    const whiteContrast = contrastRatio(lineColor, PLATE_WHITE);
    const textColor = inkContrast >= whiteContrast ? PLATE_INK : PLATE_WHITE;
    const textContrast = Math.max(inkContrast, whiteContrast);
    return {
        textColor,
        textContrast,
        largeCode: textContrast < NORMAL_TEXT_MINIMUM,
        needsOutline: contrastRatio(lineColor, glassColor) < GRAPHIC_MINIMUM,
    };
}
