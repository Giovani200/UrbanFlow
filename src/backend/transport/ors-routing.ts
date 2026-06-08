import type { Segment, RoutingMode } from "./types";
import { CARBON_FACTORS } from "@/backend/lib/constants";

type OrsProfile = "foot-walking" | "cycling-regular" | "driving-car" | "wheelchair";

const MODE_TO_PROFILE: Record<RoutingMode, OrsProfile> = {
  walk: "foot-walking",
  bike: "cycling-regular",
  carpool: "driving-car",
  tram: "foot-walking",
  bus: "foot-walking",
};

export async function fetchOrsRoute(
  origin: [number, number],
  destination: [number, number],
  mode: RoutingMode,
  wheelchair = false
): Promise<Segment> {
  const profile = wheelchair && mode === "walk" ? "wheelchair" : MODE_TO_PROFILE[mode];
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error("ORS_API_KEY missing");

  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [origin, destination],
        instructions: false,
      }),
    }
  );

  if (res.status === 429) throw new Error("ORS_RATE_LIMIT");
  if (res.status === 404) throw new Error("ORS_NO_ROUTE");
  if (!res.ok) throw new Error(`ORS_ERROR_${res.status}`);

  const data = await res.json();
  const feature = data.features[0];
  const props = feature.properties.summary;

  const distanceMeters = Math.round(props.distance);
  const durationSeconds = Math.round(props.duration);
  const distanceKm = distanceMeters / 1000;
  const carbonGrams = Math.round(CARBON_FACTORS[mode] * distanceKm);

  return {
    mode,
    geometry: feature.geometry as GeoJSON.LineString,
    durationSeconds,
    distanceMeters,
    carbonGrams,
  };
}
