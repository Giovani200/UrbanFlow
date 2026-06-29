"use client";
import { useCallback, useEffect, useState } from "react";

export type GeolocationConsent = "unknown" | "granted" | "denied";

const STORAGE_KEY = "urbanflow.geolocation.consent";

export function useGeolocationConsent() {
    const [consent, setConsent] = useState<GeolocationConsent>("unknown");

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "granted" || stored === "denied") {
            setConsent(stored);
        }
    }, []);

    const grant = useCallback(() => {
        window.localStorage.setItem(STORAGE_KEY, "granted");
        setConsent("granted");
    }, []);

    const deny = useCallback(() => {
        window.localStorage.setItem(STORAGE_KEY, "denied");
        setConsent("denied");
    }, []);

    return { consent, grant, deny };
}