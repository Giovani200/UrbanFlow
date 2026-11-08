"use client";

import { useState } from "react";
import type { Coordinates, RoutineAlternative, RoutineConnection, RoutineTodayDtoOut, TripRoute } from "@urbanflow/app-front-back-lib";
import { Button } from "@/app/components/ui/Button";
import { useNow } from "@/app/hooks/useNow";
import { formatDuration, formatParisClock } from "@/app/lib/format";
import { formatCountdown, lineCodes } from "@/app/lib/last-departure";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { connectionLostCause, transitNoun, verdictHeadline, weakestConnection } from "@/app/lib/routine";
import { isTransitSegment } from "@/app/lib/trip-results";
import { routinesService } from "@/app/services/routines.service";
import { ConnectionVerdictTag } from "./ConnectionVerdictTag";
import { SegmentSummary } from "./SegmentSummary";
import { TimeRuler } from "./TimeRuler";
import { TripSteps } from "./TripSteps";

const ACTION_ERROR = "Action impossible pour le moment. Réessaie dans un instant.";

const BODY = "[font:var(--uf-body)]";
const TITLE = "[font:var(--uf-title)] tracking-[var(--uf-title-tracking)] tabular-nums";

function firstTransitOf(route: TripRoute) {
  return route.segments.find(isTransitSegment) ?? null;
}

/** « 3601 à Henri Wallon, 4 min à pied » : ce qu'il faut savoir en partant. */
function departureSummary(route: TripRoute): string | null {
  const firstTransit = firstTransitOf(route);
  if (!firstTransit?.lineShortName) return null;
  const walkBefore = route.segments[0] && !isTransitSegment(route.segments[0]) ? route.segments[0].durationSeconds : 0;
  const meta = MODE_META[firstTransit.mode] ?? MODE_FALLBACK;
  const stop = firstTransit.departureStopName ? ` à ${firstTransit.departureStopName}` : "";
  const walk = walkBefore >= 60 ? `, ${formatDuration(walkBefore)} à pied` : "";
  return `${meta.label} ${firstTransit.lineShortName}${stop}${walk}`;
}

function takeLabel(route: TripRoute): string {
  const firstTransit = firstTransitOf(route);
  const meta = firstTransit ? (MODE_META[firstTransit.mode] ?? MODE_FALLBACK) : MODE_FALLBACK;
  const clock = formatParisClock(firstTransit?.expectedDepartureTime ?? route.departureTime ?? "");
  return `Prendre le ${meta.label} ${firstTransit?.lineShortName ?? ""} de ${clock}`.replace(/\s+/g, " ");
}

function PlanB({ today, route, destinationLabel }: { today: RoutineTodayDtoOut; route: TripRoute; destinationLabel: string }) {
  if (today.planBStatus === "unavailable") {
    return <p className={`${BODY} text-uf-ink-2`}>Plan B indisponible pour le moment.</p>;
  }
  const missedLine = firstTransitOf(route)?.lineShortName;
  const missed = missedLine ? `le ${missedLine}` : "ce départ";
  if (!today.planB?.arrivalTime) {
    return <p className={BODY}>Si tu rates {missed}, plus de solution ensuite.</p>;
  }
  const lines = lineCodes(today.planB);
  return (
    <p className={BODY}>
      <span className="font-bold">Plan B</span> · Si tu rates {missed}
      {lines ? ` : ${lines}` : ""}, {destinationLabel} vers{" "}
      <span className="[font:var(--uf-time)] tabular-nums">{formatParisClock(today.planB.arrivalTime)}</span>.
    </p>
  );
}

function RouteDetails({ today, route, now, destinationLabel }: { today: RoutineTodayDtoOut; route: TripRoute; now: number; destinationLabel: string }) {
  const frequentSegments = today.connections
    .filter((connection) => connection.verdict.kind === "frequent")
    .map((connection) => connection.toSegmentIndex);

  function verdictAfter(segmentIndex: number) {
    const connection = today.connections.find((candidate) => candidate.toSegmentIndex === segmentIndex + 1);
    if (!connection) return null;
    return (
      <li className="contents">
        <span />
        <span className="flex flex-col gap-1">
          <span className={`${BODY} font-bold`}>{connection.stopName}</span>
          <ConnectionVerdictTag verdict={connection.verdict} />
        </span>
      </li>
    );
  }

  return (
    <>
      <TimeRuler route={route} now={now} arrivalLabel={destinationLabel} />
      <TripSteps
        route={route}
        arrivalLabel={destinationLabel}
        renderAfterSegment={verdictAfter}
        approximateSegmentIndexes={frequentSegments}
        arrivalNote={frequentSegments.length > 0 ? "arrivée estimée" : undefined}
      />
    </>
  );
}

function Notes({ today }: { today: RoutineTodayDtoOut }) {
  return (
    <>
      {today.realtimeStatus === "unavailable" && <p className={`${BODY} text-uf-ink-2`}>Temps réel indisponible.</p>}
      {today.arrivesLate && today.routine && (
        <p className={`${BODY} font-bold`}>Arrivée après {today.routine.arrivalTime}.</p>
      )}
    </>
  );
}

function NoticeList({ today }: { today: RoutineTodayDtoOut }) {
  if (today.notices.length === 0) {
    return <p className={`${BODY} text-uf-ink-2`}>Cause non communiquée.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {today.notices.map((notice) => (
        <li key={`${notice.lineShortName}-${notice.text}`} className={BODY}>
          Info IDFM sur le {notice.lineShortName} : {notice.text}
        </li>
      ))}
    </ul>
  );
}

interface SolutionsProps {
  today: RoutineTodayDtoOut;
  destinationLabel: string;
  isBusy: boolean;
  onChoose: (alternativeIndex: 0 | 1) => void;
}

/** Ce qui reste quand la correspondance est perdue : on choisit une solution, le suivi continue dessus. */
function Solutions({ today, destinationLabel, isBusy, onChoose }: SolutionsProps) {
  const [selected, setSelected] = useState<0 | 1>(0);

  if (today.alternativesStatus === "unavailable") {
    return <p className={`${BODY} text-uf-ink-2`}>Solutions indisponibles pour le moment.</p>;
  }
  if (today.alternatives.length === 0) {
    return <p className={`${BODY} font-bold`}>Plus de solution pour arriver aujourd&apos;hui.</p>;
  }

  const current: RoutineAlternative = today.alternatives[selected] ?? today.alternatives[0];

  return (
    <section aria-labelledby="solutions-routine" className="flex flex-col gap-2">
      <h3 id="solutions-routine" className={`${BODY} font-bold`}>
        {today.alternatives.length > 1 ? "Deux solutions" : "Une solution"}
      </h3>
      {today.alternatives.map((alternative, index) => {
        const alternativeIndex = index === 0 ? 0 : 1;
        return (
          <button
            key={index}
            type="button"
            aria-pressed={selected === alternativeIndex}
            onClick={() => setSelected(alternativeIndex)}
            className={`uf-inset flex w-full cursor-pointer flex-col gap-2 rounded-uf-inset p-3 text-left ${selected === alternativeIndex ? "outline-2 outline-uf-ink" : ""}`}
          >
            <SegmentSummary segments={alternative.route.segments} />
            <ConnectionVerdictTag verdict={alternative.verdict} />
            {alternative.route.arrivalTime && (
              <span className={BODY}>
                {destinationLabel} vers{" "}
                <span className="[font:var(--uf-time)] tabular-nums">{formatParisClock(alternative.route.arrivalTime)}</span>
              </span>
            )}
          </button>
        );
      })}
      <Button variant="primary" disabled={isBusy} onClick={() => onChoose(selected)}>
        {takeLabel(current.route)}
      </Button>
    </section>
  );
}

function LostConnection({ today, route, connection }: { today: RoutineTodayDtoOut; route: TripRoute; connection: RoutineConnection }) {
  return (
    <div className="flex flex-col gap-2">
      <ConnectionVerdictTag verdict={connection.verdict} />
      <h2 id="routine-du-jour" className={TITLE}>Ta correspondance ne tient plus.</h2>
      <p className={BODY}>{connectionLostCause(route, connection)}</p>
      {today.realtimeStatus === "unavailable" && <p className={`${BODY} text-uf-ink-2`}>Temps réel indisponible.</p>}
    </div>
  );
}

interface RoutineCardProps {
  today: RoutineTodayDtoOut;
  position: Coordinates | null;
  onDismiss: () => void;
  onChanged: () => Promise<void>;
}

/** En tête de l'accueil, les jours de routine : quand partir, si les correspondances tiennent, et quoi faire sinon. */
export function RoutineCard({ today, position, onDismiss, onChanged }: RoutineCardProps) {
  const now = useNow();
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { routine, route } = today;
  if (!routine) return null;

  async function runAction(action: () => Promise<{ isOk: boolean }>) {
    setIsBusy(true);
    setActionError(null);
    const result = await action();
    if (result.isOk) await onChanged();
    else setActionError(ACTION_ERROR);
    setIsBusy(false);
  }

  const routineId = routine.id;
  const coordinates = position ? { latitude: position.latitude, longitude: position.longitude } : null;
  const markNotTaken = () => runAction(() => routinesService.markNotTaken(routineId, coordinates));
  const chooseAlternative = (alternativeIndex: 0 | 1) =>
    runAction(() => routinesService.chooseAlternative(routineId, alternativeIndex));

  const dismissButton = (
    <Button variant="text" onClick={onDismiss} className="shrink-0">Pas aujourd&apos;hui</Button>
  );

  if (today.status === "unavailable") {
    return (
      <section aria-label={routine.name} className="uf-inset flex items-center justify-between gap-3 rounded-uf-panel px-5 py-4">
        <p role="status" className={`${BODY} font-bold`}>Routine indisponible pour le moment.</p>
        {dismissButton}
      </section>
    );
  }

  if (!route?.departureTime) {
    return (
      <section aria-label={routine.name} className="uf-inset flex flex-col gap-3 rounded-uf-panel px-5 py-5">
        <h2 className={TITLE}>Ton trajet habituel ne circule pas à cette heure.</h2>
        <NoticeList today={today} />
        <p className={`${BODY} font-bold`}>Aucun autre trajet n&apos;arrive à l&apos;heure.</p>
        <div className="flex justify-end">{dismissButton}</div>
      </section>
    );
  }

  const hasDeparted = today.phase === "on_the_way";
  const firstTransit = firstTransitOf(route);
  const notTakenButton = hasDeparted && today.planOrigin === "usual" && firstTransit && (
    <Button variant="text" disabled={isBusy} onClick={() => void markNotTaken()} className="shrink-0">
      Je n&apos;ai pas pris {transitNoun(firstTransit.mode)}
    </Button>
  );
  const lostConnection = today.status === "connection_lost" ? today.connections.find((candidate) => candidate.verdict.kind === "missed") : undefined;
  const weakest = weakestConnection(today.connections);
  const headline = weakest && verdictHeadline(weakest);

  return (
    <section aria-labelledby="routine-du-jour" className="uf-inset flex flex-col gap-4 rounded-uf-panel px-5 py-5">
      {lostConnection ? (
        <LostConnection today={today} route={route} connection={lostConnection} />
      ) : (
        <div className="flex flex-col gap-1">
          <span className="[font:var(--uf-note)] font-bold">{routine.name}</span>
          {today.status === "disrupted" && (
            <>
              <p className={`${BODY} font-bold`}>Ton trajet habituel ne circule pas à cette heure.</p>
              <NoticeList today={today} />
            </>
          )}
          {hasDeparted ? (
            <h2 id="routine-du-jour" className={TITLE}>En route vers {routine.destinationLabel}</h2>
          ) : (
            <>
              <h2 id="routine-du-jour" className={TITLE}>Partir à {formatParisClock(route.departureTime)}</h2>
              <span role="timer" className="[font:var(--uf-time)] tabular-nums">
                {formatCountdown(Date.parse(route.departureTime) - now)}
              </span>
              {departureSummary(route) && <p className={BODY}>{departureSummary(route)}</p>}
            </>
          )}
          {headline && <p className={`${BODY} font-bold`}>{headline}</p>}
          <Notes today={today} />
        </div>
      )}

      {lostConnection && (
        <Solutions
          today={today}
          destinationLabel={routine.destinationLabel}
          isBusy={isBusy}
          onChoose={(alternativeIndex) => void chooseAlternative(alternativeIndex)}
        />
      )}

      <RouteDetails today={today} route={route} now={now} destinationLabel={routine.destinationLabel} />

      {!hasDeparted && <PlanB today={today} route={route} destinationLabel={routine.destinationLabel} />}

      {actionError && <p role="alert" className={`${BODY} font-bold`}>{actionError}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {notTakenButton}
        {dismissButton}
      </div>
    </section>
  );
}
