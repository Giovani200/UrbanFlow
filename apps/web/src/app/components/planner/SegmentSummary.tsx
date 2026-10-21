import { Fragment } from "react";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { formatDuration } from "@/app/lib/format";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment } from "@/app/lib/trip-results";
import type { TripSegment } from "@/app/services/trips.service";

/** La suite des modes d'un itinéraire : plaques pour les lignes, icône et durée pour la marche et le vélo. */
export function SegmentSummary({ segments }: { segments: TripSegment[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {segments.map((segment, index) => {
        const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
        const Icon = meta.icon;
        return (
          <Fragment key={index}>
            {index > 0 && <span className="size-1 rounded-full bg-uf-ink/35" aria-hidden="true" />}
            {isTransitSegment(segment) && segment.lineShortName ? (
              <LinePlate code={segment.lineShortName} color={segment.lineColor ?? meta.color} label={`${meta.label} ${segment.lineShortName}`} />
            ) : (
              <span className="inline-flex items-center gap-1 [font:var(--uf-note)] text-uf-ink-2">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  <span className="sr-only">{meta.label} </span>
                  {formatDuration(segment.durationSeconds)}
                </span>
              </span>
            )}
          </Fragment>
        );
      })}
    </span>
  );
}
