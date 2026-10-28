"use client";

import { useCurrentAmbiance } from "@/app/components/ambiance/AmbianceContext";
import { AMBIANCE_GLASS_COLORS, lineContrast } from "@/app/lib/line-contrast";

export type TraceState = "realtime" | "scheduled" | "walk" | "interrupted";
type Orientation = "horizontal" | "vertical";

interface RouteTraceProps {
    state: TraceState;
    color?: string;
    orientation?: Orientation;
    className?: string;
}

const OUTLINE = "0 0 0 1px var(--uf-ink)";

function patternFor(state: TraceState, color: string, orientation: Orientation): string | undefined {
    const along = orientation === "horizontal" ? "90deg" : "180deg";
    if (state === "scheduled") return `repeating-linear-gradient(${along}, ${color} 0 10px, transparent 10px 16px)`;
    if (state === "interrupted") return `repeating-linear-gradient(135deg, ${color} 0 3px, transparent 3px 7px)`;
    return undefined;
}

/**
 * Tracé d'un trajet. Plein et parcouru d'un reflet en temps réel (la seule animation), en tirets pour l'horaire prévu,
 * en pointillé fin à pied, hachuré si interrompu. Décoratif : l'information est portée par le texte voisin.
 */
export function RouteTrace({ state, color = "var(--uf-ink)", orientation = "horizontal", className = "" }: RouteTraceProps) {
    const ambiance = useCurrentAmbiance();
    const isHorizontal = orientation === "horizontal";

    if (state === "walk") {
        return (
            <span
                aria-hidden="true"
                data-state={state}
                className={`block ${isHorizontal ? "h-0 w-full border-t-[3px]" : "w-0 h-full border-l-[3px]"} border-dotted border-uf-ink-2 ${className}`}
            />
        );
    }

    const needsOutline = color.startsWith("#") && lineContrast(color, AMBIANCE_GLASS_COLORS[ambiance]).needsOutline;
    const isRealtime = state === "realtime";

    return (
        <span
            aria-hidden="true"
            data-state={state}
            className={[
                "relative block overflow-hidden rounded-[3px]",
                isHorizontal ? "h-1.5 w-full" : "w-1.5 h-full",
                isRealtime ? (isHorizontal ? "uf-reflet-horizontal" : "uf-reflet-vertical") : "",
                className,
            ].join(" ")}
            style={{
                backgroundColor: isRealtime ? color : "transparent",
                backgroundImage: patternFor(state, color, orientation),
                boxShadow: needsOutline || state === "interrupted" ? OUTLINE : undefined,
            }}
        />
    );
}
