import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConnectionVerdict, RoutineConnection, TripRoute, TripSegment } from "@urbanflow/app-front-back-lib";
import {
  chooseHomeBlock,
  connectionLostCause,
  dismissRoutine,
  isRoutineDismissed,
  transitNoun,
  verdictHeadline,
  verdictLabel,
  weakestConnection,
} from "./routine";

function connection(verdict: ConnectionVerdict, stopName = "Melun"): RoutineConnection {
  return {
    fromSegmentIndex: 0,
    toSegmentIndex: 2,
    stopName,
    arrivalTime: "2026-11-09T08:15:00+01:00",
    departureTime: "2026-11-09T08:12:00+01:00",
    verdict,
  };
}

describe("verdictLabel", () => {
  it.each<[ConnectionVerdict, string]>([
    [{ kind: "holds", marginMinutes: 6, basis: "realtime" }, "tient · 6 min"],
    [{ kind: "tight", marginMinutes: 2, basis: "realtime" }, "serrée · 2 min"],
    [{ kind: "missed", missingMinutes: 3, basis: "realtime" }, "ne tient pas · il manque 3 min"],
    [{ kind: "frequent", headwayMinutes: 5 }, "fréquent · un toutes les 5 min"],
    [{ kind: "unknown" }, "inconnue · pas de temps réel"],
  ])("%j donne « %s »", (verdict, label) => {
    expect(verdictLabel(verdict)).toBe(label);
  });

  it.each<ConnectionVerdict>([
    { kind: "holds", marginMinutes: 6, basis: "scheduled" },
    { kind: "tight", marginMinutes: 6, basis: "scheduled" },
  ])("sans temps réel, annonce une marge prévue : %j", (verdict) => {
    expect(verdictLabel(verdict)).toBe("marge prévue · 6 min");
  });
});

describe("verdictHeadline", () => {
  it("dit que ça tient seulement avec du temps réel", () => {
    expect(verdictHeadline(connection({ kind: "holds", marginMinutes: 6, basis: "realtime" }))).toBe(
      "Ta correspondance tient, 6 min de marge à Melun",
    );
    expect(verdictHeadline(connection({ kind: "holds", marginMinutes: 6, basis: "scheduled" }))).toBe(
      "Marge prévue de 6 min à Melun",
    );
  });

  it("n'annonce rien de plus pour une ligne fréquente", () => {
    expect(verdictHeadline(connection({ kind: "frequent", headwayMinutes: 5 }))).toBeNull();
  });
});

describe("weakestConnection", () => {
  it("met en avant le pire verdict : ne tient pas, inconnue, serrée, tient, fréquente", () => {
    const frequent = connection({ kind: "frequent", headwayMinutes: 5 });
    const holds = connection({ kind: "holds", marginMinutes: 6, basis: "realtime" });
    const tight = connection({ kind: "tight", marginMinutes: 2, basis: "realtime" });
    const unknown = connection({ kind: "unknown" });
    const missed = connection({ kind: "missed", missingMinutes: 1, basis: "realtime" });

    expect(weakestConnection([frequent, holds])).toBe(holds);
    expect(weakestConnection([frequent, holds, tight])).toBe(tight);
    expect(weakestConnection([tight, unknown])).toBe(unknown);
    expect(weakestConnection([unknown, missed])).toBe(missed);
  });

  it("ne renvoie rien sans correspondance, comme sur un trajet direct", () => {
    expect(weakestConnection([])).toBeNull();
  });
});

describe("chooseHomeBlock", () => {
  const onTheWay = { status: "ok", phase: "on_the_way" } as const;
  const upcoming = { status: "ok", phase: "before_departure" } as const;

  it("préfère une routine commencée au dernier départ", () => {
    expect(chooseHomeBlock({ routine: onTheWay, routineDismissed: false, lastDepartureShown: true })).toBe("routine");
  });

  it("préfère le dernier départ à une routine pas encore commencée", () => {
    expect(chooseHomeBlock({ routine: upcoming, routineDismissed: false, lastDepartureShown: true })).toBe("last_departure");
  });

  it("montre la routine seule", () => {
    expect(chooseHomeBlock({ routine: upcoming, routineDismissed: false, lastDepartureShown: false })).toBe("routine");
  });

  it("ignore une routine masquée", () => {
    expect(chooseHomeBlock({ routine: onTheWay, routineDismissed: true, lastDepartureShown: false })).toBeNull();
    expect(chooseHomeBlock({ routine: onTheWay, routineDismissed: true, lastDepartureShown: true })).toBe("last_departure");
  });

  it("garde le silence quand la routine n'a rien à dire", () => {
    const silent = { status: "none", phase: null } as const;

    expect(chooseHomeBlock({ routine: silent, routineDismissed: false, lastDepartureShown: false })).toBeNull();
    expect(chooseHomeBlock({ routine: null, routineDismissed: false, lastDepartureShown: false })).toBeNull();
  });
});

describe("« Pas aujourd'hui »", () => {
  const MONDAY_MORNING = Date.parse("2026-11-09T06:30:00Z");
  const TUESDAY_0359 = Date.parse("2026-11-10T02:59:00Z");
  const TUESDAY_0400 = Date.parse("2026-11-10T03:00:00Z");

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("masque la routine jusqu'à 03:59 le lendemain et la réaffiche à 04:00", () => {
    dismissRoutine("routine-1", MONDAY_MORNING);

    expect(isRoutineDismissed("routine-1", MONDAY_MORNING)).toBe(true);
    expect(isRoutineDismissed("routine-1", TUESDAY_0359)).toBe(true);
    expect(isRoutineDismissed("routine-1", TUESDAY_0400)).toBe(false);
  });

  it("ne masque pas les autres routines", () => {
    dismissRoutine("routine-1", MONDAY_MORNING);

    expect(isRoutineDismissed("routine-2", MONDAY_MORNING)).toBe(false);
  });

  it("ne plante pas si le stockage est indisponible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => dismissRoutine("routine-1", MONDAY_MORNING)).not.toThrow();
    expect(isRoutineDismissed("routine-1", MONDAY_MORNING)).toBe(false);
  });
});

describe("connectionLostCause", () => {
  const geometry = { type: "LineString" as const, coordinates: [] };

  function segment(overrides: Partial<TripSegment>): TripSegment {
    return { mode: "walk", geometry, durationSeconds: 0, distanceMeters: 0, carbonGrams: 0, savedGrams: 0, ...overrides };
  }

  function route(busOverrides: Partial<TripSegment>, walkSeconds: number): TripRoute {
    return {
      segments: [
        segment({ mode: "bus", lineShortName: "3601", ...busOverrides }),
        ...(walkSeconds > 0 ? [segment({ durationSeconds: walkSeconds })] : []),
        segment({ mode: "train", lineShortName: "R" }),
      ],
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      totalCarbonGrams: 0,
      totalSavedGrams: 0,
      score: 0,
    };
  }

  const lost = (toSegmentIndex: number): RoutineConnection => ({
    ...connection({ kind: "missed", missingMinutes: 8, basis: "realtime" }),
    toSegmentIndex,
  });
  const late = { scheduledArrivalTime: "2026-11-09T08:03:00+01:00", expectedArrivalTime: "2026-11-09T08:15:00+01:00" };

  it("donne le retard, les deux heures et la marche, qui expliquent le nombre de minutes manquantes", () => {
    expect(connectionLostCause(route(late, 259), lost(2))).toBe(
      "Le 3601 a 12 min de retard : tu arrives à Melun à 08:15, le R part à 08:12, avec 4 min de marche.",
    );
  });

  it("n'invente pas de marche quand il n'y en a pas", () => {
    expect(connectionLostCause(route(late, 0), lost(1))).toBe(
      "Le 3601 a 12 min de retard : tu arrives à Melun à 08:15, le R part à 08:12.",
    );
  });

  it("n'invente pas de retard quand c'est le train suivant qui part plus tôt", () => {
    const onTime = { scheduledArrivalTime: "2026-11-09T08:15:00+01:00", expectedArrivalTime: "2026-11-09T08:15:00+01:00" };

    expect(connectionLostCause(route(onTime, 0), lost(1))).toBe("Tu arrives à Melun à 08:15, le R part à 08:12.");
  });
});

describe("transitNoun", () => {
  it.each([
    ["bus", "ce bus"],
    ["tram", "ce tram"],
    ["metro", "ce métro"],
    ["train", "ce train"],
    ["rer", "ce train"],
  ] as const)("%s donne « %s »", (mode, noun) => {
    expect(transitNoun(mode)).toBe(noun);
  });
});
