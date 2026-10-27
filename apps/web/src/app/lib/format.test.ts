import { describe, expect, it } from "vitest";
import { delayInMinutes, formatDistance, formatDuration, formatKilograms, formatParisClock } from "./format";

describe("formatParisClock", () => {
  it("donne l'heure de Paris d'une heure ISO avec décalage", () => {
    expect(formatParisClock("2026-10-14T11:14:00+02:00")).toBe("11:14");
  });

  it("convertit une heure UTC en heure de Paris, été comme hiver", () => {
    expect(formatParisClock("2026-10-14T09:31:00.000Z")).toBe("11:31");
    expect(formatParisClock("2026-12-14T09:31:00.000Z")).toBe("10:31");
  });
});

describe("delayInMinutes", () => {
  it("calcule un retard positif et une avance négative", () => {
    expect(delayInMinutes("2026-10-14T07:41:00+02:00", "2026-10-14T07:45:00+02:00")).toBe(4);
    expect(delayInMinutes("2026-10-14T08:30:00+02:00", "2026-10-14T08:28:00+02:00")).toBe(-2);
  });
});

describe("formatDuration et formatDistance", () => {
  it("formate minutes, heures, mètres et kilomètres", () => {
    expect(formatDuration(18 * 60)).toBe("18 min");
    expect(formatDuration(65 * 60)).toBe("1 h 05");
    expect(formatDistance(420)).toBe("420 m");
    expect(formatDistance(12_362)).toBe("12,4 km");
  });
});

describe("formatKilograms", () => {
  it("convertit des grammes en kilogrammes à une décimale, avec la virgule", () => {
    expect(formatKilograms(1250)).toBe("1,3");
    expect(formatKilograms(0)).toBe("0,0");
  });
});
