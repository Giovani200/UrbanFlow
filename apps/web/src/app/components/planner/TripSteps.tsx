import { Footprints } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { TimeCell } from "@/app/components/ui/TimeCell";
import { formatDuration, formatParisClock } from "@/app/lib/format";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment, segmentDepartureTimes } from "@/app/lib/trip-results";
import type { TripRoute, TripSegment } from "@/app/services/trips.service";

const LIST = "grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 gap-y-3";
const TIME = "text-right [font:var(--uf-time)] tabular-nums";

function TransitRow({ segment, isApproximate }: { segment: TripSegment; isApproximate: boolean }) {
  const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
  const times = segmentDepartureTimes(segment);
  const isRealtime = segment.dataFreshness === "realtime";

  return (
    <li className="contents">
      <span className={TIME}>
        {isApproximate && times ? (
          <>
            <span className="block [font:var(--uf-note)] font-normal">vers</span>
            {times.expected}
          </>
        ) : times && isRealtime && times.delayMinutes !== 0 ? (
          <TimeCell scheduledTime={times.scheduled} expectedTime={times.expected} delayMinutes={times.delayMinutes} />
        ) : (
          times?.expected
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <LinePlate code={segment.lineShortName ?? meta.label} color={segment.lineColor ?? meta.color} label={`${meta.label} ${segment.lineShortName ?? ""}`.trim()} />
          <span className="truncate [font:var(--uf-body)] font-bold">
            {segment.departureStopName} → {segment.arrivalStopName}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-x-2">
          {segment.dataFreshness && <FreshnessStamp freshness={segment.dataFreshness} />}
          {segment.platform && <span className="[font:var(--uf-note)] text-uf-ink-2">voie {segment.platform}</span>}
        </span>
      </span>
    </li>
  );
}

function WalkRow({ segment }: { segment: TripSegment }) {
  return (
    <li className="contents">
      <span />
      <span className="inline-flex items-center gap-1.5 [font:var(--uf-body)] text-uf-ink-2">
        <Footprints size={15} aria-hidden="true" />
        {formatDuration(segment.durationSeconds)} à pied
      </span>
    </li>
  );
}

interface TripStepsProps {
  route: TripRoute;
  arrivalLabel: string;
  /** Ce qui s'intercale après une section, comme le verdict de la correspondance. */
  renderAfterSegment?: (segmentIndex: number) => ReactNode;
  /** Les sections dont l'heure n'est qu'indicative : sur une ligne fréquente, le train exact importe peu. */
  approximateSegmentIndexes?: number[];
  arrivalNote?: string;
}

/** Les étapes d'un trajet, heure par heure : chaque transport dit si son heure est en temps réel ou prévue. */
export function TripSteps({ route, arrivalLabel, renderAfterSegment, approximateSegmentIndexes = [], arrivalNote }: TripStepsProps) {
  return (
    <ol className={LIST}>
      {route.segments.map((segment, index) => (
        <Fragment key={index}>
          {isTransitSegment(segment) ? (
            <TransitRow segment={segment} isApproximate={approximateSegmentIndexes.includes(index)} />
          ) : (
            <WalkRow segment={segment} />
          )}
          {renderAfterSegment?.(index)}
        </Fragment>
      ))}
      <li className="contents">
        <span className={TIME}>{route.arrivalTime && formatParisClock(route.arrivalTime)}</span>
        <span className="flex flex-col gap-0.5">
          <span className="[font:var(--uf-body)] font-bold">{arrivalLabel}</span>
          {arrivalNote && <span className="[font:var(--uf-note)] text-uf-ink-2">{arrivalNote}</span>}
        </span>
      </li>
    </ol>
  );
}
