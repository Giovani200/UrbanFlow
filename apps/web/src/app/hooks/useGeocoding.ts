"use client";
import { useState, useEffect, useRef } from "react";
import { ILE_DE_FRANCE_BBOX } from "@/app/config/geolocalisation";
import { toSuggestions, type MapTilerFeature, type PlaceSuggestion } from "@/app/lib/geocoding-suggestions";

export type GeocodingResult = {
    label: string;
    latitude: number;
    longitude: number;
};

const MAPTILER_GEOCODING_URL = "https://api.maptiler.com/geocoding";

const SUGGESTION_COUNT = 5;

interface MapTilerGeocodingResponse {
    features: MapTilerFeature[];
}

/** Recherche de lieux et d'adresses (texte → suggestions), débouncée, limitée à l'Île-de-France. On demande le double des suggestions affichées, car les doublons d'un même lieu sont retirés. */
export function useGeocoding(query: string): PlaceSuggestion[] {
    const [results, setResults] = useState<PlaceSuggestion[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (query.length < 3) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
            if (!key) return;

            try {
                const response = await fetch(`${MAPTILER_GEOCODING_URL}/${encodeURIComponent(query)}.json?key=${key}&bbox=${ILE_DE_FRANCE_BBOX}&types=poi,address,street&language=fr&limit=${SUGGESTION_COUNT * 2}`,
                );
                if (!response.ok) return;
                const data = (await response.json()) as MapTilerGeocodingResponse;
                setResults(toSuggestions(data.features ?? []).slice(0, SUGGESTION_COUNT));
            } catch {
                /* géocodage : échec silencieux */
            }
        }, 300);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    return query.length < 3 ? [] : results;
}

// Géocodage inverse (position → adresse lisible).
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!key) return null;

    try {
        const response = await fetch(
            `${MAPTILER_GEOCODING_URL}/${longitude},${latitude}.json?key=${key}&language=fr&limit=1`,
        );
        if (!response.ok) return null;
        const data = (await response.json()) as MapTilerGeocodingResponse;
        return data.features?.[0]?.place_name ?? null;
    } catch {
        return null;
    }
}