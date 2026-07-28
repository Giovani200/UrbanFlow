"use client";

import { useEffect, useState } from "react";
import type { Coordinates, TripMode } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { tripsService } from "@/app/services/trips.service";
import { getLocalTrips } from "@/app/lib/localTrips";

export const RECENT_TRIPS_LIMIT = 3;

export interface RecentTrip {
  id: string;
  originLabel: string;
  destinationLabel: string;
  modes: TripMode[];
  origin: Coordinates | null;
  destination: Coordinates | null;
}

interface RecentTripsState {
  trips: RecentTrip[];
  loading: boolean;
}

export function useRecentTrips(): RecentTripsState {
  const { status } = useAuth();
  const [trips, setTrips] = useState<RecentTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    async function load() {
      if (status === "authenticated") {
        const result = await tripsService.listTrips({
          period: "all",
          page: 1,
          pageSize: RECENT_TRIPS_LIMIT,
        });
        if (!cancelled && result.isOk) {
          setTrips(
            result.data.items.map((item) => ({
              id: item.id,
              originLabel: item.originLabel,
              destinationLabel: item.destinationLabel,
              modes: item.modes,
              origin: item.origin,
              destination: item.destination,
            })),
          );
        }
      } else {
        const localTrips = getLocalTrips().slice(0, RECENT_TRIPS_LIMIT);
        if (!cancelled) {
          setTrips(
            localTrips.map((trip) => ({
              id: trip.id,
              originLabel: trip.originLabel,
              destinationLabel: trip.destinationLabel,
              modes: [...new Set(trip.segments.map((segment) => segment.mode))],
              origin: trip.origin ?? null,
              destination: trip.destination ?? null,
            })),
          );
        }
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return { trips, loading };
}