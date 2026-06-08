import type { Route, BikeStation, Stop } from "@/backend/transport/types";

type Result<T> = { isOk: true; data: T } | { isOk: false; error: string };

async function handleResponse<T>(res: Response): Promise<Result<T>> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { isOk: false, error: body?.error ?? "Erreur serveur" };
  }
  const data = (await res.json()) as T;
  return { isOk: true, data };
}

export const routingService = {
  async planRoute(input: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    profile?: {
      weightCarbon: number;
      weightTime: number;
      weightCost: number;
      wheelchairAccess: boolean;
    };
  }) {
    const res = await fetch("/api/routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<{ routes: Route[] }>(res);
  },

  async getStations() {
    const res = await fetch("/api/transport/gbfs");
    return handleResponse<{ stations: BikeStation[] }>(res);
  },

  async getNearbyStops(lat: number, lng: number, radius = 500) {
    const res = await fetch(`/api/transport/stops?lat=${lat}&lng=${lng}&radius=${radius}`);
    return handleResponse<{ stops: Stop[] }>(res);
  },
};
