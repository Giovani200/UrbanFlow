import type {
  ConnectionVerdict,
  RoutineConnection,
  RoutineTodayDtoOut,
  TripMode,
  TripRoute,
} from "@urbanflow/app-front-back-lib";
import { delayInMinutes, formatParisClock } from "./format";
import { serviceDayKey } from "./last-departure";

const DISMISSED_KEY_PREFIX = "urbanflow_routine_dismissed_";

/** Du plus préoccupant au plus rassurant : c'est le pire verdict qui résume le trajet. */
const VERDICT_SEVERITY: Record<ConnectionVerdict["kind"], number> = {
  missed: 0,
  unknown: 1,
  tight: 2,
  holds: 3,
  frequent: 4,
};

const TRANSIT_NOUNS: Partial<Record<TripMode, string>> = {
  bus: "ce bus",
  tram: "ce tram",
  metro: "ce métro",
};

/** Le mot d'état d'une correspondance. Sans temps réel, l'app annonce une marge prévue et n'affirme pas que ça tient. */
export function verdictLabel(verdict: ConnectionVerdict): string {
  switch (verdict.kind) {
    case "holds":
    case "tight":
      if (verdict.basis === "scheduled") return `marge prévue · ${verdict.marginMinutes} min`;
      return `${verdict.kind === "holds" ? "tient" : "serrée"} · ${verdict.marginMinutes} min`;
    case "missed":
      return `ne tient pas · il manque ${verdict.missingMinutes} min`;
    case "frequent":
      return `fréquent · un toutes les ${verdict.headwayMinutes} min`;
    case "unknown":
      return "inconnue · pas de temps réel";
  }
}

/** La phrase de résumé sous l'heure de départ. `null` quand il n'y a rien à ajouter, comme sur une ligne fréquente. */
export function verdictHeadline({ verdict, stopName }: RoutineConnection): string | null {
  switch (verdict.kind) {
    case "holds":
    case "tight":
      if (verdict.basis === "scheduled") return `Marge prévue de ${verdict.marginMinutes} min à ${stopName}`;
      return verdict.kind === "holds"
        ? `Ta correspondance tient, ${verdict.marginMinutes} min de marge à ${stopName}`
        : `Ta correspondance est serrée, ${verdict.marginMinutes} min de marge à ${stopName}`;
    case "missed":
      return `Ta correspondance ne tient pas à ${stopName}`;
    case "unknown":
      return `Pas de temps réel pour ta correspondance à ${stopName}`;
    case "frequent":
      return null;
  }
}

export function weakestConnection(connections: RoutineConnection[]): RoutineConnection | null {
  return connections.reduce<RoutineConnection | null>(
    (weakest, connection) =>
      !weakest || VERDICT_SEVERITY[connection.verdict.kind] < VERDICT_SEVERITY[weakest.verdict.kind] ? connection : weakest,
    null,
  );
}

interface HomeBlockInput {
  routine: Pick<RoutineTodayDtoOut, "status" | "phase"> | null;
  routineDismissed: boolean;
  lastDepartureShown: boolean;
}

/** Un seul bloc en tête de l'accueil : une routine déjà commencée, puis le dernier départ, puis une routine à venir. */
export function chooseHomeBlock({ routine, routineDismissed, lastDepartureShown }: HomeBlockInput): "routine" | "last_departure" | null {
  const routineShown = routine !== null && routine.status !== "none" && !routineDismissed;
  if (routineShown && routine.phase === "on_the_way") return "routine";
  if (lastDepartureShown) return "last_departure";
  return routineShown ? "routine" : null;
}

/** « Pas aujourd'hui » vaut jusqu'à la fin de la journée de service. Confort propre à l'appareil, comme « Pas ce soir ». */
export function isRoutineDismissed(routineId: string, now: number): boolean {
  try {
    return window.localStorage.getItem(`${DISMISSED_KEY_PREFIX}${routineId}`) === serviceDayKey(now);
  } catch {
    return false;
  }
}

export function dismissRoutine(routineId: string, now: number): void {
  try {
    window.localStorage.setItem(`${DISMISSED_KEY_PREFIX}${routineId}`, serviceDayKey(now));
  } catch {
    // Stockage indisponible (navigation privée) : le bloc se masque quand même jusqu'au rechargement.
  }
}

/** Explique pourquoi la correspondance est perdue, marche comprise : sans elle, le nombre de minutes manquantes étonne. */
export function connectionLostCause(route: TripRoute, connection: RoutineConnection): string {
  const previous = route.segments[connection.fromSegmentIndex];
  const next = route.segments[connection.toSegmentIndex];
  const walkSeconds = route.segments
    .slice(connection.fromSegmentIndex + 1, connection.toSegmentIndex)
    .reduce((total, segment) => total + segment.durationSeconds, 0);

  const delay =
    previous.scheduledArrivalTime && previous.expectedArrivalTime
      ? delayInMinutes(previous.scheduledArrivalTime, previous.expectedArrivalTime)
      : 0;
  const arrival = `arrives à ${connection.stopName} à ${formatParisClock(connection.arrivalTime)}`;
  const departure = `le ${next.lineShortName ?? "suivant"} part à ${formatParisClock(connection.departureTime)}`;
  const walk = walkSeconds > 0 ? `, avec ${Math.round(walkSeconds / 60)} min de marche` : "";

  return delay > 0
    ? `Le ${previous.lineShortName} a ${delay} min de retard : tu ${arrival}, ${departure}${walk}.`
    : `Tu ${arrival}, ${departure}${walk}.`;
}

/** Le véhicule dans « Je n'ai pas pris ce bus ». RER et Transilien se disent « train ». */
export function transitNoun(mode: TripMode): string {
  return TRANSIT_NOUNS[mode] ?? "ce train";
}
