import type { TransportMode } from "@/backend/lib/constants";

export type RoutingMode = Extract<TransportMode, "walk" | "bike" | "tram" | "bus" | "carpool">;

export type Segment = {
  mode: RoutingMode;
  geometry: GeoJSON.LineString;
  durationSeconds: number;
  distanceMeters: number;
  carbonGrams: number;
  stopFrom?: string;
  stopTo?: string;
  routeShortName?: string;
};

export type Route = {
  segments: Segment[];
  totalDuration: number;
  totalDistance: number;
  totalCarbon: number;
  score: number;
};

export type BikeStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bikesAvailable: number;
  docksAvailable: number;
  isRenting: boolean;
  isReturning: boolean;
};

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wheelchairBoarding: boolean;
};
