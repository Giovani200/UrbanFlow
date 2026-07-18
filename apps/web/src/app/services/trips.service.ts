import type {
  RecordTripDtoIn,
  RecordTripDtoOut,
  TripPlanningDtoIn,
  TripPlanningDtoOut,
  TripRoute,
  TripSegment,
  ListTripsDtoOut,
  TripHistoryItem,
  TripHistoryPeriod,
} from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type { TripRoute, TripSegment, ListTripsDtoOut, TripHistoryItem, TripHistoryPeriod };

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

  async recordTrip(input: RecordTripDtoIn) {
    const response = await fetch(`${API_URL}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<RecordTripDtoOut>(response);
  },

  async listTrips(params: { period: TripHistoryPeriod; page: number; pageSize: number }) {
    const query = new URLSearchParams({
      period: params.period,
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    const response = await fetch(`${API_URL}/trips?${query.toString()}`, {
      credentials: "include",
    });
    return handleResponse<ListTripsDtoOut>(response);
  },
};