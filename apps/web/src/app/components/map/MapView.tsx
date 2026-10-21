"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TripSegment } from "@/app/services/trips.service";
import type { TransitStop } from "@/app/services/transport.service";
import { useCurrentAmbiance } from "@/app/components/ambiance/AmbianceContext";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/app/config/geolocalisation";
import type { Ambiance } from "@/app/lib/ambiance";
import { lineContrast, AMBIANCE_GLASS_COLORS } from "@/app/lib/line-contrast";
import { MODE_META } from "@/app/lib/mode-meta";
import { ambiancePaintOperations, MAP_BASE_STYLE } from "./map-ambiance";

const FALLBACK_COLOR = "#5A6470";
const ROUTE_PREFIX = "route-";

export type MapViewHandle = {
  drawSegments: (segments: TripSegment[]) => void;
  clearSegments: () => void;
  fitToSegments: (segments: TripSegment[]) => void;
  recenterOnUser: (latitude: number, longitude: number) => void;
  setUserPosition: (latitude: number, longitude: number) => void;
  setNearbyMarkers: (stops: TransitStop[]) => void;
  startFollow: () => void;
};

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onFollowChange?: (following: boolean) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function segmentColor(segment: TripSegment): string {
  return segment.lineColor ?? MODE_META[segment.mode]?.color ?? FALLBACK_COLOR;
}

function applyAmbiance(map: maplibregl.Map, ambiance: Ambiance): void {
  const layers = map.getStyle()?.layers ?? [];
  const baseLayers = layers.filter((layer) => !layer.id.startsWith(ROUTE_PREFIX));
  for (const { layerId, property, value } of ambiancePaintOperations(baseLayers, ambiance)) {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
  }
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  function MapView({ center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM, onFollowChange }, ref) {
    const ambiance = useCurrentAmbiance();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const ambianceRef = useRef(ambiance);
    const routeLayerIdsRef = useRef<string[]>([]);
    const endpointMarkersRef = useRef<maplibregl.Marker[]>([]);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
    const followingRef = useRef(false);
    const onFollowChangeRef = useRef(onFollowChange);

    useEffect(() => {
      onFollowChangeRef.current = onFollowChange;
    });

    useImperativeHandle(ref, () => ({
      drawSegments(segments: TripSegment[]) {
        const map = mapRef.current;
        if (!map) return;
        this.clearSegments();

        segments.forEach((segment, index) => {
          const sourceId = `${ROUTE_PREFIX}source-${index}`;
          const isWalk = segment.mode === "walk";
          map.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: {}, geometry: segment.geometry } });

          if (!isWalk) {
            const casingId = `${ROUTE_PREFIX}casing-${index}`;
            map.addLayer({
              id: casingId,
              type: "line",
              source: sourceId,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": "#0F2238", "line-width": 8, "line-opacity": 0.35 },
            });
            routeLayerIdsRef.current.push(casingId);
          }

          const layerId = `${ROUTE_PREFIX}layer-${index}`;
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: isWalk
              ? { "line-color": "#3A4F6B", "line-width": 3, "line-dasharray": [0.5, 2] }
              : { "line-color": segmentColor(segment), "line-width": 5 },
          });
          routeLayerIdsRef.current.push(layerId);
        });

        const coordinates = segments.flatMap((segment) => segment.geometry.coordinates);
        if (coordinates.length > 0) {
          endpointMarkersRef.current = [
            new maplibregl.Marker({ element: buildEndpoint("origin") }).setLngLat(coordinates[0]).addTo(map),
            new maplibregl.Marker({ element: buildEndpoint("destination") }).setLngLat(coordinates[coordinates.length - 1]).addTo(map),
          ];
        }
      },

      clearSegments() {
        const map = mapRef.current;
        if (!map) return;
        routeLayerIdsRef.current.forEach((layerId) => {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        routeLayerIdsRef.current = [];
        Object.keys(map.getStyle()?.sources ?? {})
          .filter((sourceId) => sourceId.startsWith(ROUTE_PREFIX))
          .forEach((sourceId) => map.removeSource(sourceId));
        endpointMarkersRef.current.forEach((marker) => marker.remove());
        endpointMarkersRef.current = [];
      },

      fitToSegments(segments: TripSegment[]) {
        const map = mapRef.current;
        if (!map || segments.length === 0) return;
        const bounds = new maplibregl.LngLatBounds();
        segments.forEach((segment) => segment.geometry.coordinates.forEach(([longitude, latitude]) => bounds.extend([longitude, latitude])));
        map.fitBounds(bounds, { padding: { top: 120, bottom: 360, left: 40, right: 40 }, maxZoom: 17, duration: prefersReducedMotion() ? 0 : 800 });
      },

      recenterOnUser(latitude: number, longitude: number) {
        const map = mapRef.current;
        if (!map) return;
        if (prefersReducedMotion()) map.jumpTo({ center: [longitude, latitude], zoom: 17 });
        else map.flyTo({ center: [longitude, latitude], zoom: 17 });
      },

      setUserPosition(latitude: number, longitude: number) {
        const map = mapRef.current;
        if (!map) return;
        const lngLat: [number, number] = [longitude, latitude];
        if (userMarkerRef.current) userMarkerRef.current.setLngLat(lngLat);
        else userMarkerRef.current = new maplibregl.Marker({ element: buildUserMarker() }).setLngLat(lngLat).addTo(map);
        if (followingRef.current) this.startFollow();
      },

      startFollow() {
        const map = mapRef.current;
        const here = userMarkerRef.current?.getLngLat();
        followingRef.current = true;
        if (!map || !here) return;
        onFollowChangeRef.current?.(true);
        if (prefersReducedMotion()) map.jumpTo({ center: here, zoom: Math.max(map.getZoom(), 15) });
        else if (map.getZoom() < 14) map.flyTo({ center: here, zoom: 15 });
        else map.easeTo({ center: here, duration: 600 });
      },

      setNearbyMarkers(stops: TransitStop[]) {
        const map = mapRef.current;
        if (!map) return;
        nearbyMarkersRef.current.forEach((marker) => marker.remove());
        nearbyMarkersRef.current = stops.map((stop) =>
          new maplibregl.Marker({ element: buildStopPin(stop, ambianceRef.current) })
            .setLngLat([stop.location.longitude, stop.location.latitude])
            .addTo(map),
        );
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/${MAP_BASE_STYLE}/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
        center,
        zoom,
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      map.on("style.load", () => applyAmbiance(map, ambianceRef.current));
      map.on("movestart", (event) => {
        if (!event.originalEvent || !followingRef.current) return;
        followingRef.current = false;
        onFollowChangeRef.current?.(false);
      });
      map.on("styleimagemissing", (event) => {
        if (!map.hasImage(event.id)) map.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- la carte est créée une seule fois
    }, []);

    useEffect(() => {
      ambianceRef.current = ambiance;
      const map = mapRef.current;
      if (map?.isStyleLoaded()) applyAmbiance(map, ambiance);
    }, [ambiance]);

    return <div ref={containerRef} className="h-full w-full" />;
  }
);

function buildEndpoint(kind: "origin" | "destination"): HTMLDivElement {
  const element = document.createElement("div");
  const shape = kind === "origin" ? "border-radius:9999px;background:#FFFFFF;border:4px solid #0F2238" : "border-radius:6px;background:#0F2238;border:3px solid #FFFFFF";
  element.style.cssText = `width:20px;height:20px;box-sizing:border-box;${shape};box-shadow:0 2px 6px rgba(15,34,56,.35)`;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function buildUserMarker(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "user-location-marker";
  return element;
}

/** Arrêt proche : plaque de sa première ligne, dans la couleur officielle, contraste réglé comme LinePlate. */
function buildStopPin(stop: TransitStop, ambiance: Ambiance): HTMLDivElement {
  const line = stop.lines[0];
  const color = line?.color ?? MODE_META[line?.mode ?? "bus"]?.color ?? FALLBACK_COLOR;
  const contrast = lineContrast(color, AMBIANCE_GLASS_COLORS[ambiance]);
  const element = document.createElement("div");
  element.style.cssText = `min-width:28px;height:28px;padding:0 6px;box-sizing:border-box;border-radius:9px;background:${color};color:${contrast.textColor};display:flex;align-items:center;justify-content:center;font-family:var(--uf-font-display);font-weight:700;font-size:${contrast.largeCode ? 16 : 13}px;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,34,56,.3)`;
  element.textContent = line?.code ?? "";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", `Arrêt ${stop.name}${line ? `, ligne ${line.code}` : ""}`);
  return element;
}

export default MapView;
