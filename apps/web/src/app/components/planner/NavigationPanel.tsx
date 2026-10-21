"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { StopNode } from "@/app/components/ui/StopNode";
import type { UserPosition } from "@/app/hooks/useGeolocation";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { formatDistance, formatDuration } from "@/app/lib/format";
import { haversineMeters } from "@/app/lib/geo";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment } from "@/app/lib/trip-results";
import type { TripRoute, TripSegment } from "@/app/services/trips.service";

const ADVANCE_THRESHOLD_METERS = 30;

function segmentEnd(segment: TripSegment): { latitude: number; longitude: number } | null {
  const last = segment.geometry.coordinates.at(-1);
  return last ? { longitude: last[0], latitude: last[1] } : null;
}

function stopNames(segment: TripSegment): string[] {
  return [segment.departureStopName, ...(segment.intermediateStops?.map((stop) => stop.name) ?? []), segment.arrivalStopName].filter(
    (name): name is string => Boolean(name),
  );
}

interface NavigationPanelProps {
  route: TripRoute;
  position: UserPosition | null;
  onExit: () => void;
  onArrived: () => void;
}

/** Le trajet en cours, étape par étape. L'étape avance seule quand la position atteint la fin du tronçon. */
export function NavigationPanel({ route, position, onExit, onArrived }: NavigationPanelProps) {
  useEscapeKey(onExit);
  const [activeIndex, setActiveIndex] = useState(0);
  const segments = route.segments;
  const active = segments[activeIndex];
  const isLast = activeIndex >= segments.length - 1;
  const meta = MODE_META[active.mode] ?? MODE_FALLBACK;
  const Icon = meta.icon;

  useEffect(() => {
    const end = segmentEnd(segments[activeIndex]);
    if (!position || !end || haversineMeters(position, end) >= ADVANCE_THRESHOLD_METERS) return;
    if (activeIndex >= segments.length - 1) onArrived();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avancement piloté par le GPS (système externe)
    else setActiveIndex((index) => index + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on réagit à la position, pas au callback
  }, [position, activeIndex, segments]);

  const end = segmentEnd(active);
  const remainingMeters = position && end ? Math.round(haversineMeters(position, end)) : active.distanceMeters;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {isTransitSegment(active) && active.lineShortName ? (
          <LinePlate code={active.lineShortName} color={active.lineColor ?? meta.color} label={`${meta.label} ${active.lineShortName}`} />
        ) : (
          <Icon size={28} strokeWidth={2} aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="[font:var(--uf-note)] text-uf-ink-2">
            Étape {activeIndex + 1} sur {segments.length}
          </p>
          <h2 className="truncate [font:var(--uf-time)]">
            {isTransitSegment(active) ? `Jusqu'à ${active.arrivalStopName ?? "l'arrêt suivant"}` : meta.label}
          </h2>
        </div>
        <p className="shrink-0 text-right">
          <span className="block [font:var(--uf-time)] tabular-nums">{formatDistance(remainingMeters)}</span>
          <span className="[font:var(--uf-note)] text-uf-ink-2">restants</span>
        </p>
      </div>

      {isTransitSegment(active) ? (
        <ol className="uf-inset flex flex-col gap-1 rounded-uf-inset px-4 py-3">
          {stopNames(active).map((name, index, names) => {
            const endpoint = index === 0 || index === names.length - 1;
            return (
              <li key={`${index}-${name}`} className="flex min-h-7 items-center gap-3">
                <StopNode kind={endpoint ? "transfer" : "stop"} />
                <span className={`truncate [font:var(--uf-body)] ${endpoint ? "font-bold" : "text-uf-ink-2"}`}>{name}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="uf-inset rounded-uf-inset px-4 py-3 [font:var(--uf-body)]">
          {formatDistance(active.distanceMeters)}, environ {formatDuration(active.durationSeconds)}. Suis le tracé sur la carte.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="inset" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0} aria-label="Étape précédente" className="w-11 shrink-0 px-0">
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        {isLast ? (
          <Button variant="primary" onClick={onArrived} className="flex-1">
            Je suis arrivé
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setActiveIndex((index) => index + 1)} className="flex-1">
            Étape suivante
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        )}
      </div>

      <Button variant="text" onClick={onExit}>
        Arrêter le trajet
      </Button>
    </div>
  );
}
