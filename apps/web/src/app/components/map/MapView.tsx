"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TripSegment } from "@/app/services/trips.service";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/app/config/geolocalisation";

const MODE_COLORS: Record<string, string> = {
  walk:    "#6B7280",
  bike:    "#16A34A",
  tram:    "#2563EB",
  bus:     "#7C3AED",
  carpool: "#D97706",
};

export type MapViewHandle = {
  drawSegments: (segments: TripSegment[]) => void;
  clearSegments: () => void;
  fitToSegments: (segments: TripSegment[]) => void;
  recenterOnUser: (latitude: number, longitude: number) => void;
};

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  function MapView({ center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const layerIdsRef = useRef<string[]>([]);
    const originMarkerRef = useRef<maplibregl.Marker | null>(null);
    const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);

    useImperativeHandle(ref, () => ({
      drawSegments(segments: TripSegment[]) {
        const map = mapRef.current;
        if (!map) return;

        this.clearSegments();

        segments.forEach((segment, index) => {
          const sourceId = `route-source-${index}`;
          const layerId = `route-layer-${index}`;

          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: segment.geometry,
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
              "line-color": MODE_COLORS[segment.mode] ?? "#6B7280",
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });

          layerIdsRef.current.push(layerId);
        });

        // Marqueurs départ (point vert) + arrivée (épingle rouge).
        const allCoordinates = segments.flatMap((segment) => segment.geometry.coordinates);
        if (allCoordinates.length > 0) {
          const originPoint = allCoordinates[0];
          const destinationPoint = allCoordinates[allCoordinates.length - 1];

          const originElement = document.createElement("div");
          originElement.className = "w-4 h-4 rounded-full bg-uf-success border-2 border-white shadow-md";
          originMarkerRef.current = new maplibregl.Marker({ element: originElement })
            .setLngLat(originPoint)
            .addTo(map);

          destinationMarkerRef.current = new maplibregl.Marker({ color: "#b91c1c", anchor: "bottom" })
            .setLngLat(destinationPoint)
            .addTo(map);
        }
      },

      clearSegments() {
        const map = mapRef.current;
        if (!map) return;

        layerIdsRef.current.forEach((id) => {
          const index = id.replace("route-layer-", "");
          const sourceId = `route-source-${index}`;
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
        layerIdsRef.current = [];

        originMarkerRef.current?.remove();
        originMarkerRef.current = null;
        destinationMarkerRef.current?.remove();
        destinationMarkerRef.current = null;
      },

      fitToSegments(segments: TripSegment[]) {
        const map = mapRef.current;
        if (!map || segments.length === 0) return;

        const bounds = new maplibregl.LngLatBounds();
        segments.forEach((segment) => {
          segment.geometry.coordinates.forEach(([longitude, latitude]) => {
            bounds.extend([longitude, latitude]);
          });
        });

        map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
      },

      recenterOnUser(latitude: number, longitude: number) {
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15 });
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