"use client";

import { useEffect, useState } from "react";
import { ambianceAt, AMBIANCE_THEME_COLORS, type Ambiance } from "@/app/lib/ambiance";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

function applyToDocument(ambiance: Ambiance): void {
    document.documentElement.setAttribute("data-ambiance", ambiance);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", AMBIANCE_THEME_COLORS[ambiance]);
}

/** Tient l'ambiance (attribut `data-ambiance`) et la couleur de la barre d'état à jour, minute après minute. */
export function useAmbiance(): Ambiance {
    const [ambiance, setAmbiance] = useState<Ambiance>(() => ambianceAt(new Date()));

    useEffect(() => {
        applyToDocument(ambianceAt(new Date()));
        const interval = setInterval(() => {
            const current = ambianceAt(new Date());
            applyToDocument(current);
            setAmbiance(current);
        }, REFRESH_INTERVAL_MILLISECONDS);
        return () => clearInterval(interval);
    }, []);

    return ambiance;
}
