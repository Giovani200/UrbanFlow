import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TripRoute, TripSegment } from "@urbanflow/app-front-back-lib";
import {
  buildTimeline,
  dismissTonight,
  formatCountdown,
  isDismissedTonight,
  isShownStatus,
  lineCodes,
  serviceDayKey,
  timelinePercent,
} from "./last-departure";

const geometry = { type: "LineString" as const, coordinates: [] };

function segment(overrides: Partial<TripSegment>): TripSegment {
  return { mode: "walk", geometry, durationSeconds: 300, distanceMeters: 400, carbonGrams: 0, savedGrams: 0, ...overrides };
}

const route: TripRoute = {
  segments: [
    segment({ mode: "walk", durationSeconds: 300 }),
    segment({
      mode: "metro",
      lineShortName: "1",
      lineColor: "#FFBE00",
      dataFreshness: "scheduled",
      scheduledDepartureTime: "2026-11-03T23:38:00+01:00",
      durationSeconds: 120,
    }),
    segment({
      mode: "train",
      lineShortName: "R",
      lineColor: "#F49FB3",
      dataFreshness: "realtime",
      scheduledDepartureTime: "2026-11-03T23:56:00+01:00",
      expectedDepartureTime: "2026-11-03T23:58:00+01:00",
      durationSeconds: 1680,
    }),
    segment({ mode: "walk", durationSeconds: 1560 }),
  ],
  totalDurationSeconds: 4320,
  totalDistanceMeters: 50_000,
  totalCarbonGrams: 0,
  totalSavedGrams: 0,
  departureTime: "2026-11-03T23:33:00+01:00",
  arrivalTime: "2026-11-04T00:52:00+01:00",
};

const at = (iso: string) => Date.parse(iso);

describe("isShownStatus", () => {
  it.each(["ok", "no_result", "unavailable"] as const)("affiche %s", (status) => {
    expect(isShownStatus(status)).toBe(true);
  });

  it.each(["no_home", "near_home", "outside_window", "departed"] as const)("reste silencieux pour %s", (status) => {
    expect(isShownStatus(status)).toBe(false);
  });
});

describe("serviceDayKey", () => {
  it("à 23:00, c'est la soirée du jour", () => {
    expect(serviceDayKey(at("2026-11-03T23:00:00+01:00"))).toBe("2026-11-03");
  });

  it("à 03:59, c'est encore la soirée de la veille", () => {
    expect(serviceDayKey(at("2026-11-04T03:59:00+01:00"))).toBe("2026-11-03");
  });

  it("à 04:00, une nouvelle journée commence", () => {
    expect(serviceDayKey(at("2026-11-04T04:00:00+01:00"))).toBe("2026-11-04");
  });
});

describe("Pas ce soir", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("masque la carte jusqu'à 04:00, puis la réaffiche", () => {
    dismissTonight(at("2026-11-03T23:00:00+01:00"));

    expect(isDismissedTonight(at("2026-11-04T03:59:00+01:00"))).toBe(true);
    expect(isDismissedTonight(at("2026-11-04T04:00:00+01:00"))).toBe(false);
  });

  it("stockage indisponible : ne plante pas et ne masque rien", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => dismissTonight(at("2026-11-03T23:00:00+01:00"))).not.toThrow();
    expect(isDismissedTonight(at("2026-11-03T23:00:00+01:00"))).toBe(false);
  });
});

describe("formatCountdown", () => {
  it("donne les minutes restantes", () => {
    expect(formatCountdown(36 * 60_000)).toBe("dans 36 min");
  });

  it("passe aux heures au-delà de 60 min", () => {
    expect(formatCountdown(65 * 60_000)).toBe("dans 1 h 05");
  });

  it("sous une minute, dit que c'est l'heure", () => {
    expect(formatCountdown(30_000)).toBe("C'est l'heure");
  });
});

describe("buildTimeline", () => {
  const now = at("2026-11-03T23:02:00+01:00");

  it("borne la règle aux heures pleines autour de maintenant et de l'arrivée", () => {
    const timeline = buildTimeline(route, now);

    expect(timeline?.rangeStart).toBe(at("2026-11-03T23:00:00+01:00"));
    expect(timeline?.rangeEnd).toBe(at("2026-11-04T01:00:00+01:00"));
    expect(timeline?.hourTicks).toHaveLength(3);
  });

  it("place une section en transport à son heure estimée, et la marche à la suite", () => {
    const pieces = buildTimeline(route, now)?.pieces ?? [];

    expect(pieces[2]).toMatchObject({ kind: "transit", start: at("2026-11-03T23:58:00+01:00"), freshness: "realtime" });
    expect(pieces[3]).toMatchObject({ kind: "walk", start: at("2026-11-04T00:26:00+01:00") });
  });

  it("donne la position d'un instant en pourcentage", () => {
    const timeline = buildTimeline(route, now);

    expect(timeline && timelinePercent(timeline, at("2026-11-04T00:00:00+01:00"))).toBe(50);
  });

  it("sans heures de trajet : pas de règle", () => {
    expect(buildTimeline({ ...route, departureTime: undefined }, now)).toBeNull();
  });
});

describe("lineCodes", () => {
  it("résume les lignes empruntées, sans la marche", () => {
    expect(lineCodes(route)).toBe("1, R");
  });
});