"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListTripsDtoOut, TripHistoryPeriod } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { tripsService } from "@/app/services/trips.service";

interface TripHistoryState {
  data: ListTripsDtoOut | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

// Historique = fonction personnalisée : réservé aux utilisateurs connectés.
export function useTripHistory(period: TripHistoryPeriod, page: number, pageSize: number): TripHistoryState {
  const { status } = useAuth();
  const [data, setData] = useState<ListTripsDtoOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    tripsService.listTrips({ period, page, pageSize }).then((res) => {
      if (cancelled) return;
      setData(res.isOk ? res.data : null);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [status, period, page, pageSize, reloadKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, refreshing, refresh };
}