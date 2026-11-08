"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "@urbanflow/app-front-back-lib";
import { tripsService, type LastDepartureDtoOut } from "@/app/services/trips.service";

const REFRESH_INTERVAL_MILLISECONDS = 120_000;

/**
 * Dernier départ vers le domicile, pour un utilisateur connecté et localisé.
 * Interroge l'API à l'activation puis toutes les 2 min avec la dernière position connue : un déplacement
 * ne déclenche pas de requête à lui seul. Une erreur réseau garde le dernier résultat reçu.
 */
export function useLastDeparture({ enabled, position }: { enabled: boolean; position: Coordinates | null }) {
  const [result, setResult] = useState<LastDepartureDtoOut | null>(null);
  const positionRef = useRef(position);
  const hasPosition = position !== null;

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!enabled || !hasPosition) return;
    let active = true;

    async function refresh() {
      const current = positionRef.current;
      if (!current) return;
      const response = await tripsService.getLastDeparture({
        position: { latitude: current.latitude, longitude: current.longitude },
      });
      if (active && response.isOk) setResult(response.data);
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MILLISECONDS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [enabled, hasPosition]);

  return enabled ? result : null;
}
