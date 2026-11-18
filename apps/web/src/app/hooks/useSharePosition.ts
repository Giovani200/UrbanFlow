"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UserPosition } from "@/app/hooks/useGeolocation";
import { useVisibleInterval } from "@/app/hooks/useVisibleInterval";
import { sharesService } from "@/app/services/shares.service";

const SEND_INTERVAL_MILLISECONDS = 60_000;

/**
 * Envoie la dernière position au plus une fois par minute, seulement pendant un partage actif et app visible. Elle
 * réutilise la position déjà suivie par l'accueil : aucun suivi GPS en plus, et rien sans consentement à la géolocalisation.
 */
export function useSharePosition({ isSharing, position }: { isSharing: boolean; position: UserPosition | null }): void {
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const send = useCallback(() => {
    const latest = positionRef.current;
    if (latest) void sharesService.recordPosition({ latitude: latest.latitude, longitude: latest.longitude });
  }, []);

  useVisibleInterval(send, SEND_INTERVAL_MILLISECONDS, isSharing && position !== null);
}
