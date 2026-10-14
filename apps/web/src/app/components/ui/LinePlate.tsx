"use client";

import { useCurrentAmbiance } from "@/app/components/ambiance/AmbianceContext";
import { AMBIANCE_GLASS_COLORS, lineContrast } from "@/app/lib/line-contrast";

const PLATE_HEIGHT = { m: 26, s: 20 } as const;
const CODE_SIZE = { m: 14, s: 12 } as const;
const LARGE_CODE_SIZE = 19;
const PLATE_RELIEF = "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(255,255,255,0.5)";
const PLATE_GLOSS = "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)";

interface LinePlateProps {
    code: string;
    color: string;
    label: string;
    size?: keyof typeof PLATE_HEIGHT;
    interrupted?: boolean;
}

/** Plaque d'une ligne : code sur la couleur officielle, contraste réglé automatiquement (voir line-contrast). */
export function LinePlate({ code, color, label, size = "m", interrupted = false }: LinePlateProps) {
    const ambiance = useCurrentAmbiance();
    const contrast = lineContrast(color, AMBIANCE_GLASS_COLORS[ambiance]);
    const height = PLATE_HEIGHT[size];
    const shadows = [PLATE_RELIEF, contrast.needsOutline || interrupted ? "0 0 0 1px var(--uf-ink)" : null].filter(Boolean);

    const plate = (
        <span
            role="img"
            aria-label={interrupted ? `${label}, interrompue` : label}
            className="inline-flex items-center justify-center box-border rounded-uf-plate px-1.5 font-uf-display font-bold leading-none"
            style={{
                minWidth: height,
                height,
                fontSize: contrast.largeCode ? LARGE_CODE_SIZE : CODE_SIZE[size],
                color: interrupted ? "var(--uf-ink)" : contrast.textColor,
                backgroundColor: interrupted ? "transparent" : color,
                backgroundImage: interrupted ? `repeating-linear-gradient(135deg, ${color} 0 3px, transparent 3px 7px)` : PLATE_GLOSS,
                boxShadow: shadows.join(", "),
                textDecoration: interrupted ? "line-through" : undefined,
            }}
        >
            {code}
        </span>
    );

    if (!interrupted) {
        return plate;
    }
    return (
        <span className="inline-flex items-center gap-2">
            {plate}
            <span aria-hidden="true" className="[font:var(--uf-note)] text-uf-ink">
                interrompue
            </span>
        </span>
    );
}
