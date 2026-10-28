import { describe, expect, it } from "vitest";
import type { TripPlanningDtoOut, TripRoute } from "@urbanflow/app-front-back-lib";
import { orderedRoutes, segmentDepartureTimes, transitMessage } from "./trip-results";

function route(totalDurationSeconds: number): TripRoute {
  return { segments: [], totalDurationSeconds, totalDistanceMeters: 0, totalCarbonGrams: 0, totalSavedGrams: 0, score: 0 };
}

describe("orderedRoutes", () => {
  it("met le transport en premier, puis le vélo, puis la marche", () => {
    const transit = route(1);
    const bike = route(2);
    const walk = route(3);
    expect(orderedRoutes({ transit: [transit], bike, walk })).toEqual([transit, bike, walk]);
  });
});

describe("transitMessage", () => {
  const base: TripPlanningDtoOut = { transit: [], walk: route(3), bike: null };

  it("distingue une panne d'une absence de trajet", () => {
    expect(transitMessage({ ...base, transitStatus: "unavailable" })).toContain("indisponibles");
    expect(transitMessage({ ...base, transitStatus: "no_result" })).toContain("Aucun trajet");
  });

  it("ne dit rien quand des trajets en transport existent", () => {
    expect(transitMessage({ ...base, transit: [route(1)], transitStatus: "ok" })).toBeNull();
  });

  it("déduit le statut d'une ancienne API qui ne l'envoie pas", () => {
    expect(transitMessage(base)).toContain("Aucun trajet");
  });
});

describe("segmentDepartureTimes", () => {
  const segment = {
    mode: "train" as const,
    geometry: { type: "LineString" as const, coordinates: [] },
    durationSeconds: 1800,
    distanceMeters: 40_000,
    carbonGrams: 0,
    savedGrams: 0,
  };

  it("donne l'heure prévue, l'heure estimée et le retard à l'heure de Paris", () => {
    expect(
      segmentDepartureTimes({ ...segment, scheduledDepartureTime: "2026-10-14T07:41:00+02:00", expectedDepartureTime: "2026-10-14T07:45:00+02:00" }),
    ).toEqual({ scheduled: "07:41", expected: "07:45", delayMinutes: 4 });
  });

  it("renvoie null sans heure, et zéro retard sans estimation", () => {
    expect(segmentDepartureTimes(segment)).toBeNull();
    expect(segmentDepartureTimes({ ...segment, scheduledDepartureTime: "2026-10-14T08:12:00+02:00" })?.delayMinutes).toBe(0);
  });
});
