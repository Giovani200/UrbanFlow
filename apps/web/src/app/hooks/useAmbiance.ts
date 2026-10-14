"use client";

import { useEffect } from "react";
import { ambianceAt, AMBIANCE_THEME_COLORS } from "@/app/lib/ambiance";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

function applyAmbiance(): void {
    const ambiance = ambianceAt(new Date());
    document.documentElement.setAttribute("data-ambiance", ambiance);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", AMBIANCE_THEME_COLORS[ambiance]);
}

/** Tient l'ambiance (attribut `data-ambiance`) et la couleur de la barre d'état à jour, minute après minute. */
export function useAmbiance(): void {
    useEffect(() => {
        applyAmbiance();
        const interval = setInterval(applyAmbiance, REFRESH_INTERVAL_MILLISECONDS);
        return () => clearInterval(interval);
    }, []);
}
