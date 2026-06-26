import type { Route, Segment, BikeStation, Stop } from "@/backend/transport/types";

export type { Route, Segment, BikeStation, Stop };

import { handleResponse } from "@/app/services/lib/http";

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
