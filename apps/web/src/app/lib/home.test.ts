import { describe, expect, it } from "vitest";
import { departureTimesNote, nextRoutineSentence, walkingMinutes } from "./home";

describe("nextRoutineSentence", () => {
  const MONDAY_NOON = Date.parse("2026-11-09T11:00:00Z");

  function sentenceFor(departureTime: string, now = MONDAY_NOON) {
    return nextRoutineSentence({ name: "Travail", departureTime }, now);
  }

  it("annonce une routine plus tard dans la journée", () => {
    expect(sentenceFor("2026-11-09T18:00:00+01:00")).toBe("Prochaine routine aujourd'hui à 18:00, Travail.");
  });

  it("annonce une routine le lendemain", () => {
    expect(sentenceFor("2026-11-10T07:41:00+01:00")).toBe("Prochaine routine demain à 07:41, Travail.");
  });

  it("nomme le jour au-delà du lendemain", () => {
    expect(sentenceFor("2026-11-16T07:41:00+01:00", Date.parse("2026-11-13T09:00:00Z"))).toBe(
      "Prochaine routine lundi à 07:41, Travail.",
    );
  });

  it("compte en jours de Paris : à 23:30, 00:10 est déjà demain", () => {
    const at2330 = Date.parse("2026-11-09T22:30:00Z");

    expect(sentenceFor("2026-11-10T00:10:00+01:00", at2330)).toBe("Prochaine routine demain à 00:10, Travail.");
  });

  it("reste juste au changement d'heure", () => {
    const saturdayEvening = Date.parse("2026-10-24T18:00:00Z");

    expect(sentenceFor("2026-10-25T07:41:00+01:00", saturdayEvening)).toBe("Prochaine routine demain à 07:41, Travail.");
  });
});

describe("walkingMinutes", () => {
  it.each([
    [0, 1],
    [75, 1],
    [76, 2],
    [225, 3],
  ])("%i m à pied donnent %i min", (meters, minutes) => {
    expect(walkingMinutes(meters)).toBe(minutes);
  });
});

describe("departureTimesNote", () => {
  const realtime = { time: "2026-11-09T14:19:00+01:00", freshness: "realtime" } as const;
  const scheduled = { time: "2026-11-09T14:35:00+01:00", freshness: "scheduled" } as const;

  it("dit un seul mot quand toutes les heures ont la même fraîcheur", () => {
    expect(departureTimesNote([realtime, realtime])).toBe("temps réel");
    expect(departureTimesNote([scheduled])).toBe("horaire prévu");
  });

  it("précise heure par heure quand elles diffèrent", () => {
    expect(departureTimesNote([realtime, scheduled])).toBe("14:19 temps réel · 14:35 horaire prévu");
  });
});
