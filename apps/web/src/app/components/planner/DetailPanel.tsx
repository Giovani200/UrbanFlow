import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/Button";
import { formatDistance, formatDuration } from "@/app/lib/format";
import type { TripRoute } from "@/app/services/trips.service";
import { RouteChain } from "./RouteChain";

interface DetailPanelProps {
  route: TripRoute;
  destinationLabel: string;
  onStart: () => void;
  onBack: () => void;
  shareAction?: ReactNode;
}

/** Le détail d'un itinéraire, étape par étape, avant de partir. */
export function DetailPanel({ route, destinationLabel, onStart, onBack, shareAction }: DetailPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="inset" onClick={onBack} aria-label="Revenir aux trajets" className="w-11 shrink-0 px-0">
          <ArrowLeft size={18} aria-hidden="true" />
        </Button>
        <h2 className="flex flex-col">
          <span className="[font:var(--uf-time)] tabular-nums">{formatDuration(route.totalDurationSeconds)}</span>
          <span className="[font:var(--uf-note)] text-uf-ink-2">
            {formatDistance(route.totalDistanceMeters)} · {Math.round(route.totalCarbonGrams)} g CO₂e
          </span>
        </h2>
      </div>

      <RouteChain segments={route.segments} destinationLabel={destinationLabel} />

      {shareAction ? (
        <div className="ml-auto inline-grid auto-cols-fr grid-flow-col items-start gap-2">
          <Button variant="primary" size="compact" onClick={onStart} className="w-full">
            Partir
          </Button>
          {shareAction}
        </div>
      ) : (
        <Button variant="primary" onClick={onStart}>
          Partir
        </Button>
      )}
    </div>
  );
}
