import { fetchBikeStations } from "../gbfs-adapter";
import type { FetchStationsDtoOut } from "./fetch-stations.dto";

export async function fetchStationsUseCase(): Promise<FetchStationsDtoOut> {
  const stations = await fetchBikeStations();
  return { stations };
}
