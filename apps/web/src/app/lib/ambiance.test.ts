import { afterEach, describe, expect, it, vi } from "vitest";
import { ambianceAt, ambianceScriptSource, AMBIANCE_THEME_COLORS } from "./ambiance";

function parisSummer(time: string): Date {
    return new Date(`2026-07-14T${time}:00+02:00`);
}

describe("ambianceAt", () => {
    it.each([
        ["04:59", "nuit"],
        ["05:00", "aube"],
        ["08:59", "aube"],
        ["09:00", "jour"],
        ["16:59", "jour"],
        ["17:00", "crepuscule"],
        ["20:59", "crepuscule"],
        ["21:00", "nuit"],
        ["00:00", "nuit"],
    ])("à %s à Paris, l'ambiance est %s", (time, expected) => {
        expect(ambianceAt(parisSummer(time))).toBe(expected);
    });

    it("suit l'heure de Paris, pas celle du téléphone : 06:00 UTC en été donne l'aube de 08:00", () => {
        expect(ambianceAt(new Date("2026-07-14T06:00:00Z"))).toBe("aube");
    });

    it("reste la nuit pendant le changement d'heure du 25/10/2026", () => {
        expect(ambianceAt(new Date("2026-10-25T02:30:00+01:00"))).toBe("nuit");
    });
});

describe("AMBIANCE_THEME_COLORS", () => {
    it("reprend la première couleur du dégradé de chaque ambiance", () => {
        expect(AMBIANCE_THEME_COLORS).toEqual({
            aube: "#FFE3CC",
            jour: "#CDE7FF",
            crepuscule: "#4B2E7A",
            nuit: "#0A0F2E",
        });
    });
});

describe("ambianceScriptSource", () => {
    afterEach(() => {
        vi.useRealTimers();
        document.documentElement.removeAttribute("data-ambiance");
    });

    it.each(["2026-07-14T06:30:00+02:00", "2026-07-14T12:00:00+02:00", "2026-07-14T19:00:00+02:00", "2026-07-14T23:30:00+02:00"])(
        "pose la même ambiance que ambianceAt à %s",
        (instant) => {
            vi.useFakeTimers({ toFake: ["Date"] });
            vi.setSystemTime(new Date(instant));

            new Function(ambianceScriptSource())();

            expect(document.documentElement.dataset.ambiance).toBe(ambianceAt(new Date(instant)));
        },
    );
});
