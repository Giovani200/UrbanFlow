import { loadStops, findNearestStops } from "../gtfs-adapter";
import type { FetchStopsDtoIn, FetchStopsDtoOut } from "./fetch-stops.dto";

export async function fetchStopsUseCase(input: FetchStopsDtoIn): Promise<FetchStopsDtoOut> {
  const allStops = await loadStops();
  const stops = findNearestStops(
    input.lat,
    input.lng,
    allStops,
    input.radius,
    5,
    input.wheelchairOnly
  );
  return { stops };
}
