"use client";

import { Button } from "@/app/components/ui/Button";
import { useNow } from "@/app/hooks/useNow";
import { formatParisClock } from "@/app/lib/format";
import { formatCountdown, lineCodes } from "@/app/lib/last-departure";
import type { LastDepartureDtoOut, TripRoute } from "@/app/services/trips.service";
import { TimeRuler } from "./TimeRuler";
import { TripSteps } from "./TripSteps";

function PlanB({ result }: { result: LastDepartureDtoOut }) {
  if (result.planBStatus === "unavailable") {
    return <p className="[font:var(--uf-body)] text-uf-ink-2">Plan B indisponible pour le moment.</p>;
  }
  if (!result.planB?.arrivalTime) {
    return <p className="[font:var(--uf-body)]">Si tu rates ce départ, plus de solution avant le matin.</p>;
  }
  const lines = lineCodes(result.planB);
  return (
    <p className="[font:var(--uf-body)]">
      <span className="font-bold">Plan B</span> · Si tu rates ce départ{lines ? ` : ${lines}` : ""}, chez toi vers{" "}
      <span className="[font:var(--uf-time)] tabular-nums">{formatParisClock(result.planB.arrivalTime)}</span>.
    </p>
  );
}

interface LastDepartureCardProps {
  result: LastDepartureDtoOut;
  onGo: (route: TripRoute) => void;
  onDismiss: () => void;
}

/** En tête de l'accueil le soir : l'heure de départ pour attraper le dernier retour, et le Plan B. */
export function LastDepartureCard({ result, onGo, onDismiss }: LastDepartureCardProps) {
  const now = useNow();
  const route = result.lastDeparture;

  if (result.status !== "ok" || !route?.departureTime || !route.arrivalTime) {
    const message =
      result.status === "unavailable" ? "Dernier départ indisponible pour le moment." : "Plus de trajet ce soir pour rentrer chez toi.";
    return (
      <section aria-label="Dernier retour" className="uf-inset flex items-center justify-between gap-3 rounded-uf-panel px-5 py-4">
        <p role="status" className="[font:var(--uf-body)] font-bold">{message}</p>
        <Button variant="text" onClick={onDismiss} className="shrink-0">Pas ce soir</Button>
      </section>
    );
  }

  const departureClock = formatParisClock(route.departureTime);

  return (
    <section aria-labelledby="dernier-retour" className="uf-inset flex flex-col gap-4 rounded-uf-panel px-5 py-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="dernier-retour" className="[font:var(--uf-title)] tracking-[var(--uf-title-tracking)] tabular-nums">
          Dernier retour : partir à {departureClock}
        </h2>
        <span role="timer" className="[font:var(--uf-time)] tabular-nums">
          {formatCountdown(Date.parse(route.departureTime) - now)}
        </span>
      </div>

      <TimeRuler route={route} now={now} arrivalLabel="chez toi" />

      <TripSteps route={route} arrivalLabel="Chez toi" />

      <PlanB result={result} />

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => onGo(route)} className="flex-1">Y aller</Button>
        <Button variant="text" onClick={onDismiss}>Pas ce soir</Button>
      </div>
    </section>
  );
}
