"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Segment } from "@/app/services/routing.service";

const MODE_COLORS: Record<string, string> = {
  walk:    "#6B7280",
  bike:    "#16A34A",
  tram:    "#2563EB",
  bus:     "#7C3AED",
  carpool: "#D97706",
};

export type MapViewHandle = {
  drawSegments: (segments: Segment[]) => void;
  clearSegments: () => void;
  fitToSegments: (segments: Segment[]) => void;
  showUserLocation: (lat: number, lng: number) => void;
};

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  function MapView({ center = [2.3522, 48.8566], zoom = 12 }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const layerIdsRef = useRef<string[]>([]);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);

    useImperativeHandle(ref, () => ({
      drawSegments(segments: Segment[]) {
        const map = mapRef.current;
        if (!map) return;

        this.clearSegments();

        segments.forEach((seg, i) => {
          const sourceId = `route-source-${i}`;
          const layerId = `route-layer-${i}`;

          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: seg.geometry,
            },
          });

          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": MODE_COLORS[seg.mode] ?? "#6B7280",
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });

          layerIdsRef.current.push(layerId);
        });
      },

      clearSegments() {
        const map = mapRef.current;
        if (!map) return;

        layerIdsRef.current.forEach((id) => {
          const idx = id.replace("route-layer-", "");
          const sourceId = `route-source-${idx}`;
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
        layerIdsRef.current = [];
      },

      fitToSegments(segments: Segment[]) {
        const map = mapRef.current;
        if (!map || segments.length === 0) return;

        const bounds = new maplibregl.LngLatBounds();
        segments.forEach((seg) => {
          seg.geometry.coordinates.forEach(([lng, lat]) => {
            bounds.extend([lng, lat]);
          });
        });

        map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
      },

      showUserLocation(lat: number, lng: number) {
        const map = mapRef.current;
        if (!map) return;

        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "w-4 h-4 rounded-full bg-uf-red border-2 border-white shadow-md";
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          userMarkerRef.current.setLngLat([lng, lat]);
        }

        map.flyTo({ center: [lng, lat], zoom: 15 });
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
        center,
        zoom,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

      mapRef.current.on("styleimagemissing", (e) => {
        const id = e.id;
        if (!mapRef.current?.hasImage(id)) {
          mapRef.current?.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        }
      });

      return () => {
        mapRef.current?.remove();
        mapRef.current = null;
      };
    }, []);

    return <div ref={containerRef} className="w-full h-full" />;
  }
);

export default MapView;
