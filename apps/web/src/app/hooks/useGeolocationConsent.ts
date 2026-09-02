"use client";
import { useCallback, useSyncExternalStore } from "react";

type GeolocationConsent = "unknown" | "granted" | "denied";

const STORAGE_KEY = "urbanflow.geolocation.consent";


const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

function getSnapshot(): GeolocationConsent {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : "unknown";
}

function getServerSnapshot(): GeolocationConsent {
    return "unknown";
}

export function useGeolocationConsent() {
    const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const grant = useCallback(() => {
        window.localStorage.setItem(STORAGE_KEY, "granted");
        emit();
    }, []);

    const deny = useCallback(() => {
        window.localStorage.setItem(STORAGE_KEY, "denied");
        emit();
    }, []);

    return { consent, grant, deny };
}
