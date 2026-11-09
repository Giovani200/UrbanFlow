"use client";

import type { Coordinates } from "@urbanflow/app-front-back-lib";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { useStopDepartures } from "@/app/hooks/useStopDepartures";
import { formatParisClock } from "@/app/lib/format";
import { departureTimesNote } from "@/app/lib/home";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";

const NOTE = "[font:var(--uf-note)] text-uf-ink-2";

/** Les prochains passages d'un arrêt, dans les deux sens : l'app ne sait pas où va la personne. */
export function StopDepartures({ stopId, position }: { stopId: string; position: Coordinates }) {
  const departures = useStopDepartures(stopId, position);

  if (!departures) return null;
  if (departures.status === "unavailable") {
    return <p className={NOTE}>Horaires indisponibles pour le moment.</p>;
  }
  if (departures.rows.length === 0) {
    return <p className={NOTE}>Pas de passage annoncé pour le moment.</p>;
  }

  return (
    <ul aria-label="Prochains passages" className="flex flex-col gap-3 border-t border-uf-ink/15 pt-3">
      {departures.rows.map((row) => {
        const meta = MODE_META[row.mode] ?? MODE_FALLBACK;
        return (
          <li key={`${row.lineId}-${row.destination}`} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <LinePlate code={row.lineCode} color={row.color ?? meta.color} label={`${meta.label} ${row.lineCode}`} size="s" />
              <span className="min-w-0 flex-1 truncate [font:var(--uf-body)]">vers {row.destination}</span>
              <span className="flex shrink-0 gap-3 [font:var(--uf-time)] tabular-nums">
                {row.times.map((time, index) => (
                  <span key={index}>{formatParisClock(time.time)}</span>
                ))}
              </span>
            </span>
            <span className={NOTE}>{departureTimesNote(row.times)}</span>
          </li>
        );
      })}
    </ul>
  );
}
