import { Button } from "@/app/components/ui/Button";
import { formatDistance, formatDuration } from "@/app/lib/format";
import type { TripRoute } from "@/app/services/trips.service";

/** Fin du trajet : le bilan en une ligne, puis retour à l'accueil. */
export function ArrivalPanel({ route, destinationLabel, onDone }: { route: TripRoute; destinationLabel: string; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="[font:var(--uf-title)] tracking-[var(--uf-title-tracking)]">Arrivé à {destinationLabel}</h2>
      <p className="[font:var(--uf-body)] tabular-nums text-uf-ink-2">
        {formatDuration(route.totalDurationSeconds)} · {formatDistance(route.totalDistanceMeters)} · {Math.round(route.totalCarbonGrams)} g CO₂e
      </p>
      <Button variant="primary" onClick={onDone}>
        Terminer
      </Button>
    </div>
  );
}
