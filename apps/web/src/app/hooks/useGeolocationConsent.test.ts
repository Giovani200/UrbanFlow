import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useGeolocationConsent } from "./useGeolocationConsent";

const STORAGE_KEY = "urbanflow.geolocation.consent";

beforeEach(() => {
    localStorage.clear();
});

describe("useGeolocationConsent", () => {
    it("vaut unknown par défaut", () => {
        const { result } = renderHook(() => useGeolocationConsent());
        expect(result.current.consent).toBe("unknown");
    });

    it("grant passe à granted et persiste", () => {
        const { result } = renderHook(() => useGeolocationConsent());
        act(() => result.current.grant());
        expect(result.current.consent).toBe("granted");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("granted");
    });

    it("deny passe à denied et persiste", () => {
        const { result } = renderHook(() => useGeolocationConsent());
        act(() => result.current.deny());
        expect(result.current.consent).toBe("denied");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("denied");
    });

    it("relit la valeur stockée au montage", () => {
        localStorage.setItem(STORAGE_KEY, "denied");
        const { result } = renderHook(() => useGeolocationConsent());
        expect(result.current.consent).toBe("denied");
    });
});