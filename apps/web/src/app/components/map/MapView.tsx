"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TripSegment } from "@/app/services/trips.service";
import type { SharedVehicle, TransitStop } from "@/app/services/transport.service";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/app/config/geolocalisation";

const MODE_COLORS: Record<string, string> = {
  walk:    "#5A6470",
  bike:    "#138A5E",
  scooter: "#5A6470",
  tram:    "#2F62E6",
  bus:     "#E07A1F",
  carpool: "#9A1B2F",
  car:     "#9A1B2F",
};
const FALLBACK_COLOR = "#5A6470";

// Glyphes Lucide (viewBox 24) par mode, pour les pins carte façon DA.
const MODE_ICON_SVG: Record<string, string> = {
  walk: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  scooter: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  tram: '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
  bus: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
};
const ORIGIN_COLOR = "#138A5E";
const DESTINATION_COLOR = "#CC1B36";

export type MapViewHandle = {
  drawSegments: (segments: TripSegment[]) => void;
  clearSegments: () => void;
  fitToSegments: (segments: TripSegment[]) => void;
  recenterOnUser: (latitude: number, longitude: number) => void;
  setUserPosition: (latitude: number, longitude: number) => void;
  setNearbyMarkers: (stops: TransitStop[], vehicles: SharedVehicle[]) => void;
  startFollow: () => void;
};

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onFollowChange?: (following: boolean) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  function MapView({ center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM, onFollowChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const layerIdsRef = useRef<string[]>([]);
    const originMarkerRef = useRef<maplibregl.Marker | null>(null);
    const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
    const followingRef = useRef(false);
    const onFollowChangeRef = useRef(onFollowChange);

    useEffect(() => { onFollowChangeRef.current = onFollowChange; });

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
              "line-color": MODE_COLORS[segment.mode] ?? FALLBACK_COLOR,
              "line-width": 4,
              "line-opacity": 0.85,
            },
          });

          layerIdsRef.current.push(layerId);
        });

        const allCoordinates = segments.flatMap((segment) => segment.geometry.coordinates);
        if (allCoordinates.length > 0) {
          const originPoint = allCoordinates[0];
          const destinationPoint = allCoordinates[allCoordinates.length - 1];

          originMarkerRef.current = new maplibregl.Marker({ element: buildDot(ORIGIN_COLOR) })
            .setLngLat(originPoint)
            .addTo(map);

          destinationMarkerRef.current = new maplibregl.Marker({ color: DESTINATION_COLOR, anchor: "bottom" })
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

        map.fitBounds(bounds, { padding: 80, maxZoom: 18 });
      },

      recenterOnUser(latitude: number, longitude: number) {
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 18 });
      },

      setUserPosition(latitude: number, longitude: number) {
        const map = mapRef.current;
        if (!map) return;

        const lngLat: [number, number] = [longitude, latitude];
        if (userMarkerRef.current) userMarkerRef.current.setLngLat(lngLat);
        else userMarkerRef.current = new maplibregl.Marker({ element: buildUserMarker() })
          .setLngLat(lngLat)
          .addTo(map);

        if (followingRef.current) this.startFollow();
      },

      startFollow() {
        const map = mapRef.current;
        const here = userMarkerRef.current?.getLngLat();
        followingRef.current = true;
        if (!map || !here) return;
        onFollowChangeRef.current?.(true);
        if (map.getZoom() < 14) map.flyTo({ center: here, zoom: 15 });
        else map.easeTo({ center: here, duration: 600 });
      },

      setNearbyMarkers(stops: TransitStop[], vehicles: SharedVehicle[]) {
        const map = mapRef.current;
        if (!map) return;

        nearbyMarkersRef.current.forEach((marker) => marker.remove());
        nearbyMarkersRef.current = [];

        stops.forEach((stop) => {
          const mode = stop.lines[0]?.mode ?? "bus";
          const color = MODE_COLORS[mode] ?? FALLBACK_COLOR;
          const marker = new maplibregl.Marker({ element: buildPin(color, mode, 32) })
            .setLngLat([stop.location.longitude, stop.location.latitude])
            .addTo(map);
          nearbyMarkersRef.current.push(marker);
        });

        vehicles.forEach((vehicle) => {
          const color = vehicle.type === "bike" ? MODE_COLORS.bike : MODE_COLORS.scooter;
          const iconKey = vehicle.type === "bike" ? "bike" : "scooter";
          const marker = new maplibregl.Marker({ element: buildPin(color, iconKey, 24) })
            .setLngLat([vehicle.location.longitude, vehicle.location.latitude])
            .addTo(map);
          nearbyMarkersRef.current.push(marker);
        });
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

      mapRef.current.on("movestart", (event) => {
        if (!event.originalEvent || !followingRef.current) return;
        followingRef.current = false;
        onFollowChangeRef.current?.(false);
      });

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

function buildDot(color: string, size = 16): HTMLDivElement {
  const element = document.createElement("div");
  element.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(21,23,28,.3)`;
  return element;
}

function buildUserMarker(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "user-location-marker";
  return element;
}

// Pin carte façon DA : tuile arrondie, couleur de mode, glyphe blanc.
function buildPin(color: string, iconKey: string, size = 32): HTMLDivElement {
  const element = document.createElement("div");
  element.style.cssText = `width:${size}px;height:${size}px;border-radius:11px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(21,23,28,.25);display:flex;align-items:center;justify-content:center`;
  const glyphSize = Math.round(size * 0.55);
  const inner = MODE_ICON_SVG[iconKey] ?? "";
  element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return element;
}

export default MapView;
