import type { NearbyTransportDtoOut, SharedVehicle, TransitStop } from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type { NearbyTransportDtoOut, SharedVehicle, TransitStop };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface NearbyParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export const transportService = {
  async getNearby({ latitude, longitude, radiusMeters }: NearbyParams) {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    if (radiusMeters !== undefined) {
      query.set("radiusMeters", String(radiusMeters));
    }

    const response = await fetch(`${API_URL}/transport/nearby?${query.toString()}`);
    return handleResponse<NearbyTransportDtoOut>(response);
  },
};
