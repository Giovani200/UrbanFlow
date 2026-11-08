"use client";

import { useEffect, useState } from "react";

const TICK_MILLISECONDS = 30_000;

/** L'instant présent, mis à jour toutes les 30 s : assez pour un décompte en minutes. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}
