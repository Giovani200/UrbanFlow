"use client";

import { Footprints } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { RouteTrace } from "@/app/components/ui/RouteTrace";
import { TimeCell } from "@/app/components/ui/TimeCell";
import { formatDuration, formatParisClock } from "@/app/lib/format";
import { buildTimeline, formatCountdown, lineCodes, timelinePercent, type Timeline } from "@/app/lib/last-departure";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { isTransitSegment, segmentDepartureTimes } from "@/app/lib/trip-results";
import type { LastDepartureDtoOut, TripRoute, TripSegment } from "@/app/services/trips.service";

const COUNTDOWN_TICK_MILLISECONDS = 30_000;
const LIST = "grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 gap-y-3";
const TIME = "text-right [font:var(--uf-time)] tabular-nums";

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MILLISECONDS);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}

function rulerDescription(route: TripRoute, now: number): string {
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
    `chez toi à ${formatParisClock(route.arrivalTime ?? "")}`,
  ].join(", ");
}

/** La soirée sur une règle : maintenant, le départ, chaque section et l'arrivée. Le reflet du temps réel est la seule animation. */
function TimeRuler({ timeline, description }: { timeline: Timeline; description: string }) {
  const percent = (instant: number) => `${Math.min(100, Math.max(0, timelinePercent(timeline, instant)))}%`;
  const ticks = timeline.hourTicks;

  return (
    <div role="img" aria-label={description} className="relative h-[70px]">
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

function TransitRow({ segment }: { segment: TripSegment }) {
  const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
  const times = segmentDepartureTimes(segment);
  const isRealtime = segment.dataFreshness === "realtime";

  return (
    <li className="contents">
      <span className={TIME}>
        {times && isRealtime && times.delayMinutes !== 0 ? (
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
        {segment.dataFreshness && <FreshnessStamp freshness={segment.dataFreshness} />}
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

  const timeline = buildTimeline(route, now);
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

      {timeline && <TimeRuler timeline={timeline} description={rulerDescription(route, now)} />}

      <ol className={LIST}>
        {route.segments.map((segment, index) =>
          isTransitSegment(segment) ? <TransitRow key={index} segment={segment} /> : <WalkRow key={index} segment={segment} />,
        )}
        <li className="contents">
          <span className={TIME}>{formatParisClock(route.arrivalTime)}</span>
          <span className="[font:var(--uf-body)] font-bold">Chez toi</span>
        </li>
      </ol>

      <PlanB result={result} />

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => onGo(route)} className="flex-1">Y aller</Button>
        <Button variant="text" onClick={onDismiss}>Pas ce soir</Button>
      </div>
    </section>
  );
}
