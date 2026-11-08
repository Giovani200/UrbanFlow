import { describe, expect, it } from "vitest";
import type { TripRoute, TripSegment } from "@urbanflow/app-front-back-lib";
import { nextArrivalDateTime, toRoutineFields } from "./routine-form";

const MONDAY_0700 = Date.parse("2026-11-09T06:00:00Z");
const MONDAY_1000 = Date.parse("2026-11-09T09:00:00Z");
const SUNDAY_1200 = Date.parse("2026-11-08T11:00:00Z");

describe("nextArrivalDateTime", () => {
  it("prend aujourd'hui si le jour est choisi et l'heure encore à venir", () => {
    expect(nextArrivalDateTime([1], "09:00", MONDAY_0700)).toBe("2026-11-09T09:00");
  });

  it("passe à la semaine suivante si l'heure est déjà passée", () => {
    expect(nextArrivalDateTime([1], "09:00", MONDAY_1000)).toBe("2026-11-16T09:00");
  });

  it("prend le prochain jour parmi ceux choisis", () => {
    expect(nextArrivalDateTime([3, 5], "09:00", MONDAY_0700)).toBe("2026-11-11T09:00");
    expect(nextArrivalDateTime([1, 2], "09:00", MONDAY_1000)).toBe("2026-11-10T09:00");
  });

  it("le dimanche à midi, trouve le lundi suivant", () => {
    expect(nextArrivalDateTime([1, 2, 3, 4, 5], "09:00", SUNDAY_1200)).toBe("2026-11-09T09:00");
  });

  it("une arrivée à 00:30 le vendredi soir tombe le samedi matin au calendrier", () => {
    expect(nextArrivalDateTime([5], "00:30", MONDAY_0700)).toBe("2026-11-14T00:30");
  });

  it("reste juste autour du changement d'heure", () => {
    const saturdayEvening = Date.parse("2026-10-24T18:00:00Z");

    expect(nextArrivalDateTime([7], "09:00", saturdayEvening)).toBe("2026-10-25T09:00");
  });
});

describe("toRoutineFields", () => {
  const geometry = { type: "LineString" as const, coordinates: [] };
  const form = {
    name: " Travail ",
    origin: { label: "Henri Wallon", latitude: 48.5244, longitude: 2.6437 },
    destination: { label: "La Défense", latitude: 48.892, longitude: 2.238 },
    arrivalTime: "09:00",
    weekdays: [5, 1, 3],
  };

  function segment(overrides: Partial<TripSegment>): TripSegment {
    return { mode: "walk", geometry, durationSeconds: 60, distanceMeters: 50, carbonGrams: 0, savedGrams: 0, ...overrides };
  }

  function route(segments: TripSegment[]): TripRoute {
    return {
      segments,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      totalCarbonGrams: 0,
      totalSavedGrams: 0,
      score: 0,
      departureTime: "2026-11-09T07:41:30+01:00",
    };
  }

  it("mémorise les lignes du trajet dans l'ordre, sans la marche, et son heure de départ", () => {
    const fields = toRoutineFields(
      form,
      route([
        segment({}),
        segment({ mode: "bus", lineId: "C00881" }),
        segment({}),
        segment({ mode: "train", lineId: "C01731" }),
      ]),
    );

    expect(fields).toMatchObject({
      lineIds: ["C00881", "C01731"],
      usualDepartureTime: "07:41",
      arrivalTime: "09:00",
    });
  });

  it("trie les jours et retire les espaces du nom", () => {
    const fields = toRoutineFields(form, route([segment({ mode: "bus", lineId: "C00881" })]));

    expect(fields?.weekdays).toEqual([1, 3, 5]);
    expect(fields?.name).toBe("Travail");
  });

  it("refuse un trajet dont une ligne n'est pas identifiée : la routine ne pourrait pas le retrouver", () => {
    const fields = toRoutineFields(form, route([segment({ mode: "bus" }), segment({ mode: "train", lineId: "C01731" })]));

    expect(fields).toBeNull();
  });

  it("refuse un trajet à pied, sans ligne", () => {
    expect(toRoutineFields(form, route([segment({})]))).toBeNull();
  });

  it("refuse un trajet sans heure de départ", () => {
    const withoutDeparture = { ...route([segment({ mode: "bus", lineId: "C00881" })]), departureTime: undefined };

    expect(toRoutineFields(form, withoutDeparture)).toBeNull();
  });
});
