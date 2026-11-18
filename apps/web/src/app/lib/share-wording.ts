import type { ShareInformationLevel, ShareLastPosition, ShareStep, ShareViewDtoOut } from "@urbanflow/app-front-back-lib";
import { formatParisClock } from "./format";

export const INVALID_LINK_HEADLINE = "Ce lien n'est plus valable.";

export const LEVEL_WORDS: Record<ShareInformationLevel, string> = {
  confirmed: "confirmé",
  planned: "prévu",
};

function sharerName(view: ShareViewDtoOut): string {
  return view.sharerFirstName ?? "Ton proche";
}

function atClock(isoDateTime: string | null): string {
  return isoDateTime ? ` à ${formatParisClock(isoDateTime)}` : "";
}

/** Les fins de partage ne se confondent jamais : chacune a sa phrase, et aucune n'interprète un silence. */
export function stateHeadline(view: ShareViewDtoOut): string {
  const name = sharerName(view);
  switch (view.state) {
    case "in_progress":
      return `${name} est en route.`;
    case "arrival_unconfirmed":
      return `Arrivée prévue${atClock(view.estimatedArrival?.time ?? null)}, pas encore confirmée.`;
    case "arrived":
      return `Arrivée confirmée par ${name}${atClock(view.endedAt)}.`;
    case "stopped":
      return `${name} a arrêté le partage${atClock(view.endedAt)}.`;
    case "expired":
      return "Partage terminé, arrivée non confirmée.";
  }
}

/** Au niveau prévu, l'étape en cours reste au conditionnel : elle est déduite, pas observée. */
export function stepTitle(step: ShareStep, isCurrent: boolean): string {
  if (step.level === "confirmed") {
    return `Près de ${step.stopName}`;
  }
  switch (step.kind) {
    case "board": {
      const line = step.lineShortName ?? "transport";
      return isCurrent ? `Devrait être dans le ${line}` : `${line} à ${step.stopName}`;
    }
    case "connection":
      return `Correspondance à ${step.stopName}`;
    case "arrive":
      return step.stopName;
  }
}

export function lastPositionText(position: ShareLastPosition): string {
  const clock = formatParisClock(position.at);
  return position.outsideItinerary
    ? `Dernière position à ${clock}, hors de l'itinéraire prévu.`
    : `Dernière position près de ${position.nearStopName}, à ${clock}.`;
}
