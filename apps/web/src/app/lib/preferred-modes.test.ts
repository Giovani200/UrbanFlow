import { describe, expect, it } from "vitest";
import { PREFERRED_MODES, keepKnownModes } from "./preferred-modes";

describe("PREFERRED_MODES", () => {
  it("propose les modes d'Île-de-France, sans la trottinette", () => {
    expect(PREFERRED_MODES).toEqual(expect.arrayContaining(["metro", "rer", "train"]));
    expect(PREFERRED_MODES).not.toContain("scooter");
  });
});

describe("keepKnownModes", () => {
  it("écarte la trottinette déjà enregistrée et garde l'ordre reçu", () => {
    expect(keepKnownModes(["scooter", "bus", "metro"])).toEqual(["bus", "metro"]);
  });

  it("retire les doublons", () => {
    expect(keepKnownModes(["bus", "bus"])).toEqual(["bus"]);
  });

  it("renvoie une liste vide pour une liste vide", () => {
    expect(keepKnownModes([])).toEqual([]);
  });
});
