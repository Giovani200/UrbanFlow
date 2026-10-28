import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { RouteTrace } from "@/app/components/ui/RouteTrace";
import { StopNode } from "@/app/components/ui/StopNode";
import { TimeCell } from "@/app/components/ui/TimeCell";
import { formatDistance, formatDuration } from "@/app/lib/format";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment, segmentDepartureTimes } from "@/app/lib/trip-results";
import type { TripSegment } from "@/app/services/trips.service";

const RAIL = "grid grid-cols-[24px_minmax(0,1fr)] gap-x-3";

function TransitStep({ segment, isFirst }: { segment: TripSegment; isFirst: boolean }) {
  const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
  const color = segment.lineColor ?? meta.color;
  const times = segmentDepartureTimes(segment);
  const stopCount = (segment.intermediateStops?.length ?? 0) + 1;

  return (
    <>
      <div className={RAIL}>
        <span className="flex justify-center pt-1">
          <StopNode kind={isFirst ? "origin" : "transfer"} />
        </span>
        <div className="flex items-start justify-between gap-3 pb-2">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2">
              <LinePlate code={segment.lineShortName ?? meta.label} color={color} label={`${meta.label} ${segment.lineShortName ?? ""}`.trim()} />
              <span className="truncate [font:var(--uf-body)] font-bold">{segment.departureStopName}</span>
            </span>
            {segment.dataFreshness && <FreshnessStamp freshness={segment.dataFreshness} />}
          </div>
          {times && <TimeCell scheduledTime={times.scheduled} expectedTime={times.expected} delayMinutes={times.delayMinutes} />}
        </div>
      </div>
      <div className={`${RAIL} min-h-14`}>
        <span className="flex justify-center">
          <RouteTrace state={segment.dataFreshness === "realtime" ? "realtime" : "scheduled"} color={color} orientation="vertical" />
        </span>
        <span className="self-center [font:var(--uf-note)] text-uf-ink-2">
          {formatDuration(segment.durationSeconds)} · {stopCount} arrêt{stopCount > 1 ? "s" : ""} jusqu&apos;à {segment.arrivalStopName}
        </span>
      </div>
    </>
  );
}

function WalkStep({ segment, isFirst }: { segment: TripSegment; isFirst: boolean }) {
  const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
  return (
    <>
      {isFirst && (
        <div className={RAIL}>
          <span className="flex justify-center pt-1">
            <StopNode kind="origin" />
          </span>
          <span className="pb-2 [font:var(--uf-body)] font-bold">Départ</span>
        </div>
      )}
      <div className={`${RAIL} min-h-12`}>
        <span className="flex justify-center">
          <RouteTrace state="walk" orientation="vertical" />
        </span>
        <span className="self-center [font:var(--uf-note)] text-uf-ink-2">
          {meta.label}, {formatDuration(segment.durationSeconds)} · {formatDistance(segment.distanceMeters)}
        </span>
      </div>
    </>
  );
}

/** La chaîne complète d'un itinéraire : arrêts, lignes, heures, fraîcheur et marche entre les deux. */
export function RouteChain({ segments, destinationLabel }: { segments: TripSegment[]; destinationLabel: string }) {
  return (
    <ol className="flex flex-col">
      {segments.map((segment, index) => (
        <li key={index}>
          {isTransitSegment(segment) ? <TransitStep segment={segment} isFirst={index === 0} /> : <WalkStep segment={segment} isFirst={index === 0} />}
        </li>
      ))}
      <li className={RAIL}>
        <span className="flex justify-center pt-1">
          <StopNode kind="destination" />
        </span>
        <span className="truncate [font:var(--uf-body)] font-bold">{destinationLabel}</span>
      </li>
    </ol>
  );
}
