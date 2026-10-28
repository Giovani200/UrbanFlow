import { describe, expect, it } from "vitest";
import type { TransitLine } from "@urbanflow/app-front-back-lib";
import { primaryStopMode } from "./stop-mode";

function line(code: string, mode: TransitLine["mode"]): TransitLine {
  return { code, mode };
}

describe("primaryStopMode", () => {
  it("retient le mode le plus structurant, quel que soit l'ordre des lignes", () => {
    expect(primaryStopMode([line("N12", "bus"), line("75", "bus"), line("11", "metro")])).toBe("metro");
    expect(primaryStopMode([line("T3a", "tram"), line("A", "rer")])).toBe("rer");
    expect(primaryStopMode([line("P", "train"), line("T4", "tram")])).toBe("train");
  });

  it("donne le bus pour un arrêt de bus seul", () => {
    expect(primaryStopMode([line("46", "bus")])).toBe("bus");
  });

  it("donne le bus par défaut quand l'arrêt n'a aucune ligne", () => {
    expect(primaryStopMode([])).toBe("bus");
  });
});
