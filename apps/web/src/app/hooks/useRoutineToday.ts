"use client";

import { useCallback, useState } from "react";
import { useVisibleInterval } from "@/app/hooks/useVisibleInterval";
import { dismissRoutine, isRoutineDismissed } from "@/app/lib/routine";
import { routinesService, type RoutineTodayDtoOut } from "@/app/services/routines.service";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

/**
 * La routine du moment, rafraîchie toutes les 60 s quand l'app est visible. Une erreur réseau garde le dernier résultat.
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

  useVisibleInterval(refresh, REFRESH_INTERVAL_MILLISECONDS, enabled);

  function dismiss() {
    const routineId = today?.routine?.id;
    if (!routineId) return;
    dismissRoutine(routineId, Date.now());
    setIsDismissed(true);
  }

  return { today: enabled ? today : null, isDismissed, dismiss, refresh };
}
