import { describe, expect, it } from "vitest";
import { nextPositionOnToggle, positionAfterDrag } from "./sheet-position";

describe("positionAfterDrag", () => {
  it("monte d'un cran quand on glisse vers le haut", () => {
    expect(positionAfterDrag("collapsed", -80)).toBe("half");
    expect(positionAfterDrag("half", -80)).toBe("expanded");
    expect(positionAfterDrag("expanded", -80)).toBe("expanded");
  });

  it("descend d'un cran quand on glisse vers le bas", () => {
    expect(positionAfterDrag("expanded", 80)).toBe("half");
    expect(positionAfterDrag("half", 80)).toBe("collapsed");
    expect(positionAfterDrag("collapsed", 80)).toBe("collapsed");
  });

  it("ne bouge pas pour un petit glissement", () => {
    expect(positionAfterDrag("half", 30)).toBe("half");
  });
});

describe("nextPositionOnToggle", () => {
  it("monte jusqu'en haut puis replie", () => {
    expect(nextPositionOnToggle("collapsed")).toBe("half");
    expect(nextPositionOnToggle("half")).toBe("expanded");
    expect(nextPositionOnToggle("expanded")).toBe("collapsed");
  });
});
