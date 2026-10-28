import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { formatDistance, formatDuration } from "@/app/lib/format";
import { isTransitSegment, segmentDepartureTimes } from "@/app/lib/trip-results";
import type { TripRoute } from "@/app/services/trips.service";
import { SegmentSummary } from "./SegmentSummary";

interface RouteCardProps {
  route: TripRoute;
  selected: boolean;
  onSelect: () => void;
}

/** Un itinéraire proposé : modes, durée, heure de départ du premier transport et fraîcheur de cette heure. */
export function RouteCard({ route, selected, onSelect }: RouteCardProps) {
  const firstTransit = route.segments.find(isTransitSegment);
  const departure = firstTransit ? segmentDepartureTimes(firstTransit) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`uf-inset flex w-full flex-col gap-3 rounded-uf-inset p-4 text-left ${selected ? "outline-2 outline-uf-ink" : ""}`}
    >
      <SegmentSummary segments={route.segments} />
      <span className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="[font:var(--uf-time)] tabular-nums">{formatDuration(route.totalDurationSeconds)}</span>
          <span className="[font:var(--uf-note)] text-uf-ink-2">
            {formatDistance(route.totalDistanceMeters)} · {Math.round(route.totalCarbonGrams)} g CO₂e
          </span>
        </span>
        {departure && firstTransit && (
          <span className="flex flex-col items-end gap-0.5">
            <span className="[font:var(--uf-note)] tabular-nums">départ {departure.expected}</span>
            <FreshnessStamp freshness={firstTransit.dataFreshness === "realtime" ? "realtime" : "scheduled"} />
          </span>
        )}
      </span>
    </button>
  );
}
