import type { Route, Segment } from "../types";
import type { PlanRouteDtoIn } from "./plan-route.dto";
import { fetchOrsRoute } from "../ors-routing";
import { fetchBikeStations, findNearestStation } from "../gbfs-adapter";
import { loadStops, findNearestStops } from "../gtfs-adapter";
import { scoreRoute } from "./score-route";

function sumSegments(segments: Segment[]): Pick<Route, "totalDuration" | "totalDistance" | "totalCarbon"> {
  return {
    totalDuration: segments.reduce((s, seg) => s + seg.durationSeconds, 0),
    totalDistance: segments.reduce((s, seg) => s + seg.distanceMeters, 0),
    totalCarbon: segments.reduce((s, seg) => s + seg.carbonGrams, 0),
  };
}

async function buildWalkRoute(
  input: PlanRouteDtoIn
): Promise<Route | null> {
  try {
    const wheelchair = input.profile?.wheelchairAccess ?? false;
    const segment = await fetchOrsRoute(
      [input.originLng, input.originLat],
      [input.destLng, input.destLat],
      "walk",
      wheelchair
    );
    const totals = sumSegments([segment]);
    return { segments: [segment], ...totals, score: 0 };
  } catch {
    return null;
  }
}

async function buildBikeRoute(
  input: PlanRouteDtoIn
): Promise<Route | null> {
  try {
    const stations = await fetchBikeStations();
    const nearOrigin = findNearestStation(input.originLat, input.originLng, stations);
    if (!nearOrigin) return null;

    const nearDest = findNearestStation(input.destLat, input.destLng, stations);
    if (!nearDest) return null;

    const wheelchair = input.profile?.wheelchairAccess ?? false;

    const segments: Segment[] = [];

    const walkToStation = await fetchOrsRoute(
      [input.originLng, input.originLat],
      [nearOrigin.lng, nearOrigin.lat],
      "walk",
      wheelchair
    );
    if (walkToStation.distanceMeters > 50) {
      segments.push(walkToStation);
    }

    const bikeSegment = await fetchOrsRoute(
      [nearOrigin.lng, nearOrigin.lat],
      [nearDest.lng, nearDest.lat],
      "bike"
    );
    segments.push(bikeSegment);

    const walkFromStation = await fetchOrsRoute(
      [nearDest.lng, nearDest.lat],
      [input.destLng, input.destLat],
      "walk",
      wheelchair
    );
    if (walkFromStation.distanceMeters > 50) {
      segments.push(walkFromStation);
    }

    const totals = sumSegments(segments);
    return { segments, ...totals, score: 0 };
  } catch {
    return null;
  }
}

async function buildTransitRoute(
  input: PlanRouteDtoIn
): Promise<Route | null> {
  try {
    const stops = await loadStops();
    const wheelchair = input.profile?.wheelchairAccess ?? false;

    const nearOriginStops = findNearestStops(
      input.originLat, input.originLng, stops, 800, 1, wheelchair
    );
    const nearDestStops = findNearestStops(
      input.destLat, input.destLng, stops, 800, 1, wheelchair
    );

    if (nearOriginStops.length === 0 || nearDestStops.length === 0) return null;

    const originStop = nearOriginStops[0];
    const destStop = nearDestStops[0];

    const segments: Segment[] = [];

    const walkToStop = await fetchOrsRoute(
      [input.originLng, input.originLat],
      [originStop.lng, originStop.lat],
      "walk",
      wheelchair
    );
    if (walkToStop.distanceMeters > 50) {
      segments.push(walkToStop);
    }

    const transitSegment = await fetchOrsRoute(
      [originStop.lng, originStop.lat],
      [destStop.lng, destStop.lat],
      "tram"
    );
    transitSegment.mode = "tram";
    transitSegment.stopFrom = originStop.name;
    transitSegment.stopTo = destStop.name;
    segments.push(transitSegment);

    const walkFromStop = await fetchOrsRoute(
      [destStop.lng, destStop.lat],
      [input.destLng, input.destLat],
      "walk",
      wheelchair
    );
    if (walkFromStop.distanceMeters > 50) {
      segments.push(walkFromStop);
    }

    const totals = sumSegments(segments);
    return { segments, ...totals, score: 0 };
  } catch {
    return null;
  }
}

export async function planRouteUseCase(input: PlanRouteDtoIn): Promise<Route[]> {
  const results = await Promise.allSettled([
    buildWalkRoute(input),
    buildBikeRoute(input),
    buildTransitRoute(input),
  ]);

  const weights = {
    weightCarbon: input.profile?.weightCarbon ?? 50,
    weightTime: input.profile?.weightTime ?? 30,
    weightCost: input.profile?.weightCost ?? 20,
  };

  const routes = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is Route => r !== null);

  return scoreRoute(routes, weights);
}
