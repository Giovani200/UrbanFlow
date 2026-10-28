"use client";

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TripSegment } from "@/app/services/trips.service";
import type { TransitStop } from "@/app/services/transport.service";
import { useCurrentAmbiance } from "@/app/components/ambiance/AmbianceContext";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/app/config/geolocalisation";
import type { Ambiance } from "@/app/lib/ambiance";
import { MODE_META } from "@/app/lib/mode-meta";
import { primaryStopMode } from "@/app/lib/stop-mode";
import { ambiancePaintOperations, MAP_BASE_STYLE } from "./map-ambiance";

const FALLBACK_COLOR = "#5A6470";
const ROUTE_PREFIX = "route-";
/** Part de l'écran couverte par le panneau à mi-hauteur (48dvh dans BottomSheet) : les arrêts sont cadrés au-dessus. */
const HALF_SHEET_SHARE = 0.48;
const NO_STOPS: TransitStop[] = [];

export type MapViewHandle = {
  drawSegments: (segments: TripSegment[]) => void;
  clearSegments: () => void;
  fitToSegments: (segments: TripSegment[]) => void;
  recenterOnUser: (latitude: number, longitude: number) => void;
  startFollow: () => void;
};

interface UserPosition {
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  /** Position de l'utilisateur, passée en prop pour qu'elle survive au chargement différé et à une recréation de la carte. */
  userPosition?: UserPosition | null;
  /** Arrêts proches à marquer et à cadrer ; en prop pour la même raison que la position. */
  nearbyStops?: TransitStop[];
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
  function MapView({ center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM, userPosition = null, nearbyStops = NO_STOPS, onFollowChange }, ref) {
    const ambiance = useCurrentAmbiance();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const ambianceRef = useRef(ambiance);
    const routeLayerIdsRef = useRef<string[]>([]);
    const endpointMarkersRef = useRef<maplibregl.Marker[]>([]);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const userPositionRef = useRef(userPosition);
    const nearbyMarkersRef = useRef<maplibregl.Marker[]>([]);
    const nearbyStopsRef = useRef(nearbyStops);
    const followingRef = useRef(false);
    const onFollowChangeRef = useRef(onFollowChange);

    useEffect(() => {
      onFollowChangeRef.current = onFollowChange;
    });

    function placeUserMarker(map: maplibregl.Map) {
      const position = userPositionRef.current;
      if (!position) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }
      const lngLat: [number, number] = [position.longitude, position.latitude];
      if (userMarkerRef.current) userMarkerRef.current.setLngLat(lngLat);
      else userMarkerRef.current = new maplibregl.Marker({ element: buildUserMarker() }).setLngLat(lngLat).addTo(map);
    }

    /** Remplace les repères d'arrêts, puis cadre les arrêts et la position de l'utilisateur au-dessus du panneau. */
    function showNearbyStops(map: maplibregl.Map) {
      const stops = nearbyStopsRef.current;
      nearbyMarkersRef.current.forEach((marker) => marker.remove());
      nearbyMarkersRef.current = stops.map((stop) =>
        new maplibregl.Marker({ element: buildStopPin(stop) })
          .setLngLat([stop.location.longitude, stop.location.latitude])
          .addTo(map),
      );
      if (stops.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      stops.forEach((stop) => bounds.extend([stop.location.longitude, stop.location.latitude]));
      const here = userMarkerRef.current?.getLngLat();
      if (here) bounds.extend(here);
      const sheetHeight = Math.round(window.innerHeight * HALF_SHEET_SHARE);
      map.fitBounds(bounds, { padding: { top: 100, bottom: sheetHeight + 24, left: 40, right: 72 }, maxZoom: 17, duration: prefersReducedMotion() ? 0 : 800 });
    }

    function followUser() {
      const map = mapRef.current;
      const here = userMarkerRef.current?.getLngLat();
      followingRef.current = true;
      if (!map || !here) return;
      onFollowChangeRef.current?.(true);
      if (prefersReducedMotion()) map.jumpTo({ center: here, zoom: Math.max(map.getZoom(), 15) });
      else if (map.getZoom() < 14) map.flyTo({ center: here, zoom: 15 });
      else map.easeTo({ center: here, duration: 600 });
    }

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

      startFollow: followUser,
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
      placeUserMarker(map);
      showNearbyStops(map);

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
        userMarkerRef.current = null;
        nearbyMarkersRef.current = [];
        endpointMarkersRef.current = [];
        routeLayerIdsRef.current = [];
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- la carte est créée une seule fois
    }, []);

    useEffect(() => {
      userPositionRef.current = userPosition;
      const map = mapRef.current;
      if (!map) return;
      placeUserMarker(map);
      if (userPosition && followingRef.current) followUser();
    }, [userPosition]);

    useEffect(() => {
      nearbyStopsRef.current = nearbyStops;
      const map = mapRef.current;
      if (map) showNearbyStops(map);
    }, [nearbyStops]);

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

/** Arrêt proche : pictogramme de son mode le plus structurant (métro, RER, train, tram, bus), sur la couleur du mode. */
function buildStopPin(stop: TransitStop): HTMLDivElement {
  const mode = primaryStopMode(stop.lines);
  const meta = MODE_META[mode] ?? MODE_META.bus;
  const element = document.createElement("div");
  element.className = "uf-stop-pin";
  element.style.backgroundColor = meta.color;
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", `Arrêt ${stop.name}, ${meta.label}`);
  element.innerHTML = renderToStaticMarkup(createElement(meta.icon, { size: 15, strokeWidth: 2.25, "aria-hidden": true }));
  return element;
}

export default MapView;
