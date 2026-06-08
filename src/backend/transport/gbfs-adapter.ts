import type { BikeStation } from "./types";
import { TRANSPORT_API } from "@/backend/lib/constants";

type GbfsDiscovery = {
  data: { fr: { feeds: { name: string; url: string }[] } };
};

type StationInfo = {
  data: {
    stations: {
      station_id: string;
      name: string;
      lat: number;
      lon: number;
    }[];
  };
};

type StationStatus = {
  data: {
    stations: {
      station_id: string;
      num_bikes_available: number;
      num_docks_available: number;
      is_renting: boolean;
      is_returning: boolean;
    }[];
  };
};

async function fetchGbfsUrl(feedName: string): Promise<string> {
  const res = await fetch(TRANSPORT_API.gbfsBaseUrl, {
    next: { revalidate: TRANSPORT_API.revalidateSeconds },
  });
  if (!res.ok) throw new Error("GBFS_DISCOVERY_FAILED");

  const discovery: GbfsDiscovery = await res.json();
  const feed = discovery.data.fr.feeds.find((f) => f.name === feedName);
  if (!feed) throw new Error(`GBFS_FEED_NOT_FOUND: ${feedName}`);
  return feed.url;
}

export async function fetchBikeStations(): Promise<BikeStation[]> {
  const [infoUrl, statusUrl] = await Promise.all([
    fetchGbfsUrl("station_information"),
    fetchGbfsUrl("station_status"),
  ]);

  const [infoRes, statusRes] = await Promise.all([
    fetch(infoUrl, { next: { revalidate: TRANSPORT_API.revalidateSeconds } }),
    fetch(statusUrl, { next: { revalidate: TRANSPORT_API.revalidateSeconds } }),
  ]);

  if (!infoRes.ok || !statusRes.ok) throw new Error("GBFS_FETCH_FAILED");

  const info: StationInfo = await infoRes.json();
  const status: StationStatus = await statusRes.json();

  const statusMap = new Map(
    status.data.stations.map((s) => [s.station_id, s])
  );

  return info.data.stations
    .map((station) => {
      const st = statusMap.get(station.station_id);
      if (!st) return null;
      return {
        id: station.station_id,
        name: station.name,
        lat: station.lat,
        lng: station.lon,
        bikesAvailable: st.num_bikes_available,
        docksAvailable: st.num_docks_available,
        isRenting: st.is_renting,
        isReturning: st.is_returning,
      };
    })
    .filter((s): s is BikeStation => s !== null);
}

export function findNearestStation(
  lat: number,
  lng: number,
  stations: BikeStation[]
): BikeStation | null {
  const available = stations.filter((s) => s.bikesAvailable > 0 && s.isRenting);
  if (available.length === 0) return null;

  return available.reduce((nearest, s) => {
    const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
    const dNearest = (nearest.lat - lat) ** 2 + (nearest.lng - lng) ** 2;
    return d < dNearest ? s : nearest;
  });
}
