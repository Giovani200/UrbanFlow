import { z } from "zod";
import type { Stop } from "./types";

const GtfsStopSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String).optional(),
  stop_id: z.union([z.string(), z.number()]).transform(String).optional(),
  name: z.string().optional(),
  stop_name: z.string().optional(),
  lat: z.number().optional(),
  stop_lat: z.number().optional(),
  lon: z.number().optional(),
  lng: z.number().optional(),
  stop_lon: z.number().optional(),
  wheelchair_boarding: z.union([z.number(), z.string()]).optional(),
});

const GtfsResponseSchema = z.array(GtfsStopSchema);

let stopsCache: Stop[] | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function parseStopsCsv(csvText: string): Promise<Stop[]> {
  const lines = csvText.split("\n");
  const header = lines[0].split(",");

  const idx = {
    stop_id: header.indexOf("stop_id"),
    stop_name: header.indexOf("stop_name"),
    stop_lat: header.indexOf("stop_lat"),
    stop_lon: header.indexOf("stop_lon"),
    wheelchair_boarding: header.indexOf("wheelchair_boarding"),
  };

  const stops: Stop[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;

    const lat = parseFloat(cols[idx.stop_lat]);
    const lng = parseFloat(cols[idx.stop_lon]);
    if (isNaN(lat) || isNaN(lng)) continue;

    stops.push({
      id: cols[idx.stop_id].trim(),
      name: cols[idx.stop_name].replace(/"/g, "").trim(),
      lat,
      lng,
      wheelchairBoarding: cols[idx.wheelchair_boarding]?.trim() === "1",
    });
  }

  return stops;
}

export async function loadStops(): Promise<Stop[]> {
  if (stopsCache && Date.now() - lastFetch < CACHE_TTL_MS) {
    return stopsCache;
  }

  const gtfsUrl = process.env.GTFS_TAG_URL;
  if (!gtfsUrl) throw new Error("GTFS_TAG_URL missing");

  const res = await fetch(`${gtfsUrl}/GetTAGlines/json?types=stops`);
  if (!res.ok) throw new Error(`GTFS_FETCH_FAILED_${res.status}`);

  const data = await res.json();

  if (Array.isArray(data)) {
    const parsed = GtfsResponseSchema.parse(data);
    stopsCache = parsed.map((s) => ({
      id: s.id ?? s.stop_id ?? "",
      name: s.name ?? s.stop_name ?? "",
      lat: s.lat ?? s.stop_lat ?? 0,
      lng: s.lon ?? s.lng ?? s.stop_lon ?? 0,
      wheelchairBoarding: s.wheelchair_boarding === 1 || s.wheelchair_boarding === "1",
    }));
  } else if (typeof data === "string") {
    stopsCache = await parseStopsCsv(data);
  } else {
    throw new Error("GTFS_UNEXPECTED_FORMAT");
  }

  lastFetch = Date.now();
  return stopsCache;
}

export function findNearestStops(
  lat: number,
  lng: number,
  stops: Stop[],
  radiusMeters = 500,
  limit = 5,
  wheelchairOnly = false
): Stop[] {
  const radiusDeg = radiusMeters / 111_320;

  return stops
    .filter((s) => {
      if (wheelchairOnly && !s.wheelchairBoarding) return false;
      const dLat = Math.abs(s.lat - lat);
      const dLng = Math.abs(s.lng - lng);
      return dLat < radiusDeg && dLng < radiusDeg;
    })
    .map((s) => ({
      stop: s,
      dist: (s.lat - lat) ** 2 + (s.lng - lng) ** 2,
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((s) => s.stop);
}
