"use client";
import { useState, useEffect, useRef } from "react";
import { GRENOBLE_BBOX } from "@/app/config/geolocalisation";

export type GeocodingResult = {
    label: string;
    latitude: number;
    longitude: number;
};

const MAPTILER_GEOCODING_URL = "https://api.maptiler.com/geocoding";

interface MapTilerGeocodingResponse {
    features: Array<{ place_name: string; center: [number, number] }>;
}

// Recherche d'adresses (texte → liste de lieux), débouncée, scoping Grenoble.
export function useGeocoding(query: string): GeocodingResult[] {
    const [results, setResults] = useState<GeocodingResult[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (query.length < 3) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
            if (!key) return;

            try {
                const response = await fetch(`${MAPTILER_GEOCODING_URL}/${encodeURIComponent(query)}.json?key=${key}&bbox=${GRENOBLE_BBOX}&types=poi,address,street&language=fr&limit=5`,
                );
                if (!response.ok) return;
                const data = (await response.json()) as MapTilerGeocodingResponse;
                const items: GeocodingResult[] = (data.features ?? []).map((feature) => ({
                    label: feature.place_name,
                    latitude: feature.center[1],
                    longitude: feature.center[0],
                }));
                setResults(items);
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