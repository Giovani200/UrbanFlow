"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface MapViewProps {
    center?: [number, number];
    zoom?: number;
}

export default function MapView(
    {center = [5.7245, 45.1885], zoom = 13,}: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        mapRef.current = new maplibregl.Map({
            container: containerRef.current,
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
            center,
            zoom,
        });

        mapRef.current.addControl(new
        maplibregl.NavigationControl(), "top-right");

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    return <div ref={containerRef} className="w-full
  h-full" />;
}