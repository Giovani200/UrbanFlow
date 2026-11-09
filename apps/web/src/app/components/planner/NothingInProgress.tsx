"use client";

import type { RoutineTodayDtoOut } from "@urbanflow/app-front-back-lib";
import { useNow } from "@/app/hooks/useNow";
import { nextRoutineSentence } from "@/app/lib/home";

interface NothingInProgressProps {
  nextRoutine: NonNullable<RoutineTodayDtoOut["nextRoutine"]>;
}

/** Quand aucun trajet n'est en cours : ce qui vient ensuite, pour qu'on n'ait pas à le chercher. */
export function NothingInProgress({ nextRoutine }: NothingInProgressProps) {
  const now = useNow();

  return (
    <section aria-label="Prochaine routine" className="flex flex-col gap-0.5">
      <h2 className="[font:var(--uf-time)]">Rien en cours pour toi.</h2>
      <p className="[font:var(--uf-body)] text-uf-ink-2">{nextRoutineSentence(nextRoutine, now)}</p>
    </section>
  );
}
