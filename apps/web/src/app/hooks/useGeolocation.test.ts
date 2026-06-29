import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

const watchPosition = vi.fn();
const clearWatch = vi.fn();

function stubGeolocation(available: boolean) {
    vi.stubGlobal("navigator", available ? { geolocation: { watchPosition, clearWatch } } : {});
}

beforeEach(() => {
    watchPosition.mockReset();
    clearWatch.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("useGeolocation", () => {
    it("démarre à l'état inactive", () => {
        stubGeolocation(true);
        const { result } = renderHook(() => useGeolocation());
        expect(result.current.status).toBe("inactive");
        expect(result.current.position).toBeNull();
    });

    it("passe à watching et expose la position en cas de succès", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((success: PositionCallback) => {
            success({
                coords: { latitude: 45.1885, longitude: 5.7245, accuracy: 12 },
            } as GeolocationPosition);
            return 1;
        });
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());

        expect(result.current.status).toBe("watching");
        expect(result.current.position).toEqual({ latitude: 45.1885, longitude: 5.7245, accuracy: 12 });
    });

    it("passe à denied quand l'utilisateur refuse", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
            error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
            return 1;
        });

        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());

        expect(result.current.status).toBe("denied");
    });

    it("passe à unavailable sur une autre erreur (timeout)", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
            error({ code: 3, PERMISSION_DENIED: 1 } as GeolocationPositionError);
            return 1;
        });

        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());

        expect(result.current.status).toBe("unavailable");
    });

    it("passe à unavailable si la géoloc n'est pas supportée", () => {
        stubGeolocation(false);
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());
        expect(result.current.status).toBe("unavailable");
    });

    it("stop libère le watch et revient à inactive", () => {
        stubGeolocation(true);
        watchPosition.mockReturnValue(7);

        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());
        act(() => result.current.stop());

        expect(clearWatch).toHaveBeenCalledWith(7);
        expect(result.current.status).toBe("inactive");
    });
});