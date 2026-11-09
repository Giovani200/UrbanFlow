"use client";

import { useEffect } from "react";

/**
 * Appelle `callback` tout de suite puis à intervalle régulier, seulement quand l'app est visible : le quota PRIM
 * dépend du temps passé dans l'app. Au retour dans l'app, l'appel est immédiat. `callback` doit être stable.
 */
export function useVisibleInterval(callback: () => void, intervalMilliseconds: number, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let interval: number | undefined;

    function stop() {
      window.clearInterval(interval);
      interval = undefined;
    }

    function start() {
      if (interval !== undefined) return;
      callback();
      interval = window.setInterval(callback, intervalMilliseconds);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [callback, intervalMilliseconds, enabled]);
}
