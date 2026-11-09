"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates, StopDeparturesDtoOut } from "@urbanflow/app-front-back-lib";
import { useVisibleInterval } from "@/app/hooks/useVisibleInterval";
import { transportService } from "@/app/services/transport.service";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

/**
 * Les prochains passages d'un arrêt, rafraîchis toutes les 60 s quand l'app est visible. Un déplacement ne déclenche
 * pas d'appel à lui seul. Une erreur réseau compte comme une source indisponible, pour ne jamais montrer d'heures périmées.
 */
export function useStopDepartures(stopId: string, position: Coordinates): StopDeparturesDtoOut | null {
  const [departures, setDepartures] = useState<StopDeparturesDtoOut | null>(null);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const refresh = useCallback(async () => {
    const { latitude, longitude } = positionRef.current;
    const response = await transportService.getStopDepartures(stopId, { latitude, longitude });
    setDepartures(response.isOk ? response.data : { status: "unavailable", rows: [] });
  }, [stopId]);

  useVisibleInterval(refresh, REFRESH_INTERVAL_MILLISECONDS, true);

  return departures;
}
