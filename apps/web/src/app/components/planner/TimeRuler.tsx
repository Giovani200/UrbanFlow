import { RouteTrace } from "@/app/components/ui/RouteTrace";
import { formatDuration, formatParisClock } from "@/app/lib/format";
import { buildTimeline, timelinePercent } from "@/app/lib/last-departure";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment } from "@/app/lib/trip-results";
import type { TripRoute } from "@/app/services/trips.service";

function rulerDescription(route: TripRoute, now: number, arrivalLabel: string): string {
  const steps = route.segments.map((segment) => {
    if (!isTransitSegment(segment)) return `${formatDuration(segment.durationSeconds)} à pied`;
    const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
    const freshness = segment.dataFreshness === "realtime" ? "temps réel" : "prévu";
    return `${meta.label} ${segment.lineShortName ?? ""} ${freshness}`.replace(/\s+/g, " ");
  });
  return [
    `Règle horaire : maintenant ${formatParisClock(new Date(now).toISOString())}`,
    `départ ${formatParisClock(route.departureTime ?? "")}`,
    ...steps,
    `${arrivalLabel} à ${formatParisClock(route.arrivalTime ?? "")}`,
  ].join(", ");
}

interface TimeRulerProps {
  route: TripRoute;
  now: number;
  /** Lu par les lecteurs d'écran à la fin de la description (« chez toi »). */
  arrivalLabel: string;
}

/** Le trajet sur une règle : maintenant, le départ, chaque section et l'arrivée. Le reflet du temps réel est la seule animation. */
export function TimeRuler({ route, now, arrivalLabel }: TimeRulerProps) {
  const timeline = buildTimeline(route, now);
  if (!timeline) return null;

  const percent = (instant: number) => `${Math.min(100, Math.max(0, timelinePercent(timeline, instant)))}%`;
  const ticks = timeline.hourTicks;

  return (
    <div role="img" aria-label={rulerDescription(route, now, arrivalLabel)} className="relative h-[70px]">
      <span className="absolute top-0 -translate-x-1/2 [font:var(--uf-note)] font-bold" style={{ left: percent(timeline.now) }}>
        maintenant
      </span>
      <span className="absolute top-5 h-7 w-0.5 -translate-x-1/2 rounded-sm bg-uf-ink" style={{ left: percent(timeline.now) }} />
      <span className="absolute inset-x-0 top-[33px] border-t border-uf-ink/25" />
      {timeline.pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-[31px]"
          style={{ left: percent(piece.start), width: `calc(${percent(piece.end)} - ${percent(piece.start)})` }}
        >
          <RouteTrace state={piece.kind === "walk" ? "walk" : piece.freshness === "realtime" ? "realtime" : "scheduled"} color={piece.color} />
        </span>
      ))}
      <span className="absolute top-[26px] size-4 -translate-x-1/2 rounded-full border-[3px] border-uf-ink bg-uf-inset" style={{ left: percent(timeline.departure) }} />
      <span className="absolute top-[26px] size-4 -translate-x-1/2 rounded-[5px] bg-uf-ink" style={{ left: percent(timeline.arrival) }} />
      {ticks.map((tick, index) => (
        <span
          key={tick}
          className={`absolute bottom-0 [font:var(--uf-note)] tabular-nums text-uf-ink-2 ${index === 0 ? "" : index === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: percent(tick) }}
        >
          {formatParisClock(new Date(tick).toISOString())}
        </span>
      ))}
    </div>
  );
}
