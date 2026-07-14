"use client";

import { useEffect, useState } from "react";
import { aggregateCarbon, type CarbonSummaryDtoOut, type Period } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { carbonService } from "@/app/services/carbon.service";
import { getLocalTrips, localTripsToEvents } from "@/app/lib/localTrips";

interface CarbonSummaryState {
  summary: CarbonSummaryDtoOut | null;
  loading: boolean;
  isAnonymous: boolean;
}

// Deux sources, un seul contrat : serveur si connecté, agrégation locale sinon.
export function useCarbonSummary(period: Period): CarbonSummaryState {
  const { status } = useAuth();
  const [summary, setSummary] = useState<CarbonSummaryDtoOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      if (status === "authenticated") {
        const result = await carbonService.getSummary(period);
        if (!cancelled) setSummary(result.isOk ? result.data : null);
      } else {
        // Anonyme : objectif masqué (null), agrégation sur les trajets locaux.
        const events = localTripsToEvents(getLocalTrips());
        if (!cancelled) setSummary(aggregateCarbon(events, period, new Date(), null));
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [period, status]);

  return { summary, loading, isAnonymous: status === "unauthenticated" };
}