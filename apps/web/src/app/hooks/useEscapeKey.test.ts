import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEscapeKey } from "./useEscapeKey";

function pressKey(key: string): void {
    document.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("useEscapeKey", () => {
    it("appelle le gestionnaire sur Échap", () => {
        const onEscape = vi.fn();
        renderHook(() => useEscapeKey(onEscape));

        pressKey("Escape");

        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it("ignore les autres touches", () => {
        const onEscape = vi.fn();
        renderHook(() => useEscapeKey(onEscape));

        pressKey("Enter");
        pressKey("a");

        expect(onEscape).not.toHaveBeenCalled();
    });

    it("retire l'écouteur au démontage", () => {
        const onEscape = vi.fn();
        const { unmount } = renderHook(() => useEscapeKey(onEscape));

        unmount();
        pressKey("Escape");

        expect(onEscape).not.toHaveBeenCalled();
    });

    it("utilise le dernier gestionnaire fourni, sans fermeture périmée", () => {
        const premier = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(({ handler }) => useEscapeKey(handler), {
            initialProps: { handler: premier },
        });

        rerender({ handler: second });
        pressKey("Escape");

        expect(premier).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });
});
