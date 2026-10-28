import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAmbiance } from "./useAmbiance";

function themeColor(): string | null {
    return document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null;
}

describe("useAmbiance", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = "#CC1B36";
        document.head.appendChild(meta);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
        document.documentElement.removeAttribute("data-ambiance");
    });

    it("pose l'ambiance et la couleur de barre d'état du moment", () => {
        vi.setSystemTime(new Date("2026-07-14T12:00:00+02:00"));

        renderHook(() => useAmbiance());

        expect(document.documentElement.dataset.ambiance).toBe("jour");
        expect(themeColor()).toBe("#CDE7FF");
    });

    it("bascule d'ambiance quand l'heure passe", () => {
        vi.setSystemTime(new Date("2026-07-14T16:59:30+02:00"));
        renderHook(() => useAmbiance());

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(document.documentElement.dataset.ambiance).toBe("crepuscule");
        expect(themeColor()).toBe("#4B2E7A");
    });
});
