import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

const watchPosition = vi.fn();
const clearWatch = vi.fn();

function stubGeolocation(available: boolean) {
    vi.stubGlobal("navigator", available ? { geolocation: { watchPosition, clearWatch } } : {});
}

function geolocationError(code: number): GeolocationPositionError {
    return { code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
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
            error(geolocationError(1));
            return 1;
        });

        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());

        expect(result.current.status).toBe("denied");
    });

    it("passe à unavailable quand la position est indisponible", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
            error(geolocationError(2));
            return 1;
        });

        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());

        expect(result.current.status).toBe("unavailable");
    });

    it("ignore les timeouts et reste en watching", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
            error(geolocationError(3));
            return 1;
        });

        const onFailure = vi.fn();
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start(onFailure));

        expect(result.current.status).toBe("watching");
        expect(onFailure).not.toHaveBeenCalled();
        expect(clearWatch).not.toHaveBeenCalled();
    });

    it("passe à unavailable si la géoloc n'est pas supportée", () => {
        stubGeolocation(false);
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start());
        expect(result.current.status).toBe("unavailable");
    });

    it("transmet l'échec au handler fourni à start", () => {
        stubGeolocation(true);
        watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
            error(geolocationError(1));
            return 1;
        });

        const onFailure = vi.fn();
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start(onFailure));

        expect(onFailure).toHaveBeenCalledWith("denied");
    });

    it("ne notifie personne quand start est lancé sans handler", () => {
        stubGeolocation(true);
        watchPosition.mockReturnValue(1);

        const onFailure = vi.fn();
        const { result } = renderHook(() => useGeolocation());
        act(() => result.current.start(onFailure));
        act(() => result.current.stop());
        act(() => result.current.start());

        const [, notifyError] = watchPosition.mock.calls[1] as [PositionCallback, PositionErrorCallback];
        act(() => notifyError(geolocationError(1)));

        expect(onFailure).not.toHaveBeenCalled();
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
