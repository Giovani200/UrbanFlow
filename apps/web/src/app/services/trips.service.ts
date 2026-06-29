import type {
  TripPlanningDtoIn,
  TripPlanningDtoOut,
  TripRoute,
  TripSegment,
} from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type { TripRoute, TripSegment };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const tripsService = {
  async planTrip(input: TripPlanningDtoIn) {
    const response = await fetch(`${API_URL}/trips/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<TripPlanningDtoOut>(response);
  },
};