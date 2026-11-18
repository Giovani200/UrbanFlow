"use client";

import { useCallback, useState } from "react";
import { useVisibleInterval } from "@/app/hooks/useVisibleInterval";
import { sharesService, type CurrentShareDtoOut } from "@/app/services/shares.service";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;

export type ActiveShare = NonNullable<CurrentShareDtoOut["share"]>;

/** Une erreur réseau garde le dernier état connu : un partage actif ne doit pas disparaître de l'écran sur une coupure. */
export function useActiveShare({ enabled }: { enabled: boolean }) {
  const [share, setShare] = useState<ActiveShare | null>(null);

  const refresh = useCallback(async () => {
    const result = await sharesService.getCurrent();
    if (result.isOk) setShare(result.data.share);
  }, []);

  useVisibleInterval(refresh, REFRESH_INTERVAL_MILLISECONDS, enabled);

  async function end(action: () => Promise<{ isOk: boolean }>): Promise<boolean> {
    const result = await action();
    if (result.isOk) setShare(null);
    return result.isOk;
  }

  return {
    share: enabled ? share : null,
    refresh,
    confirmArrival: () => end(sharesService.confirmArrival),
    stop: () => end(sharesService.stop),
  };
}
