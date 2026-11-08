"use client";

import { useCallback, useEffect, useState } from "react";
import { dismissRoutine, isRoutineDismissed } from "@/app/lib/routine";
import { routinesService, type RoutineTodayDtoOut } from "@/app/services/routines.service";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

/**
 * La routine du moment. Rafraîchie toutes les 60 s, seulement quand l'app est visible : le quota dépend du temps
 * passé dans l'app. Au retour dans l'app, la lecture est immédiate. Une erreur réseau garde le dernier résultat reçu.
 * « Pas aujourd'hui » est relu à chaque rafraîchissement, donc la routine revient d'elle-même le lendemain.
 */
export function useRoutineToday({ enabled }: { enabled: boolean }) {
  const [today, setToday] = useState<RoutineTodayDtoOut | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const refresh = useCallback(async () => {
    const response = await routinesService.getToday();
    if (!response.isOk) return;
    const routineId = response.data.routine?.id;
    setToday(response.data);
    setIsDismissed(routineId !== undefined && isRoutineDismissed(routineId, Date.now()));
  }, []);

  function dismiss() {
    const routineId = today?.routine?.id;
    if (!routineId) return;
    dismissRoutine(routineId, Date.now());
    setIsDismissed(true);
  }

  useEffect(() => {
    if (!enabled) return;
    let interval: number | undefined;

    function stop() {
      window.clearInterval(interval);
      interval = undefined;
    }

    function start() {
      if (interval !== undefined) return;
      void refresh();
      interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MILLISECONDS);
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
  }, [enabled, refresh]);

  return { today: enabled ? today : null, isDismissed, dismiss, refresh };
}
