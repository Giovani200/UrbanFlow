import { describe, expect, it } from "vitest";
import type { ShareStep, ShareViewDtoOut } from "@urbanflow/app-front-back-lib";
import { lastPositionText, stateHeadline, stepTitle } from "./share-wording";

function view(overrides: Partial<ShareViewDtoOut>): ShareViewDtoOut {
  return {
    sharerFirstName: "Léa",
    state: "in_progress",
    endedAt: null,
    destinationLabel: "Chez moi",
    estimatedArrival: { time: "2026-11-17T00:50:00+01:00", freshness: "realtime" },
    steps: [],
    currentStepIndex: null,
    lastPosition: null,
    ...overrides,
  };
}

const board: ShareStep = {
  kind: "board",
  stopName: "Melun",
  time: "2026-11-16T23:56:00+01:00",
  freshness: "realtime",
  level: "planned",
  lineShortName: "R",
  lineId: "C01731",
  lineColor: null,
  lineTextColor: null,
};

describe("stateHeadline", () => {
  it("donne un titre distinct pour chaque fin de partage", () => {
    const endedAt = "2026-11-17T00:47:00+01:00";
    const headlines = [
      stateHeadline(view({ state: "arrived", endedAt })),
      stateHeadline(view({ state: "stopped", endedAt })),
      stateHeadline(view({ state: "arrival_unconfirmed" })),
      stateHeadline(view({ state: "expired", endedAt })),
    ];

    expect(new Set(headlines).size).toBe(4);
    expect(headlines[0]).toBe("Arrivée confirmée par Léa à 00:47.");
    expect(headlines[1]).toBe("Léa a arrêté le partage à 00:47.");
  });

  it("une arrivée dépassée sans confirmation le dit, sans rien interpréter", () => {
    expect(stateHeadline(view({ state: "arrival_unconfirmed" }))).toBe("Arrivée prévue à 00:50, pas encore confirmée.");
  });

  it("sans prénom connu, parle d'un proche", () => {
    expect(stateHeadline(view({ sharerFirstName: null }))).toBe("Ton proche est en route.");
  });
});

describe("stepTitle", () => {
  it("au niveau prévu, l'étape en cours reste au conditionnel", () => {
    expect(stepTitle(board, true)).toBe("Devrait être dans le R");
    expect(stepTitle(board, false)).toBe("R à Melun");
  });

  it("seul le niveau confirmé situe la personne près d'un arrêt", () => {
    expect(stepTitle({ ...board, level: "confirmed" }, true)).toBe("Près de Melun");
  });

  it("une correspondance n'est jamais annoncée comme tenue", () => {
    const connection: ShareStep = {
      kind: "connection",
      stopName: "Gare de Lyon",
      time: null,
      freshness: null,
      level: "planned",
      verdict: { kind: "holds", marginMinutes: 4, basis: "realtime" },
    };

    expect(stepTitle(connection, false)).toBe("Correspondance à Gare de Lyon");
  });
});

describe("lastPositionText", () => {
  it("nomme l'arrêt le plus proche, ou dit que la position est hors de l'itinéraire", () => {
    const at = "2026-11-17T00:31:00+01:00";

    expect(lastPositionText({ at, nearStopName: "Melun", outsideItinerary: false })).toBe("Dernière position près de Melun, à 00:31.");
    expect(lastPositionText({ at, nearStopName: null, outsideItinerary: true })).toBe(
      "Dernière position à 00:31, hors de l'itinéraire prévu.",
    );
  });
});
