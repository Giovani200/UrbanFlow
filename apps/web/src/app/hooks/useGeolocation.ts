"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationFailure = "denied" | "unavailable";
type GeolocationStatus = "inactive" | "watching" | GeolocationFailure;

export interface UserPosition {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface UseGeolocation {
    status: GeolocationStatus;
    position: UserPosition | null;
    start: (onFailure?: (reason: GeolocationFailure) => void) => void;
    stop: () => void;
}

const WATCH_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
};

export function useGeolocation(): UseGeolocation {
    const [status, setStatus] = useState<GeolocationStatus>("inactive");
    const [position, setPosition] = useState<UserPosition | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const onFailureRef = useRef<((reason: GeolocationFailure) => void) | null>(null);

    const stop = useCallback(() => {
        onFailureRef.current = null;
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setStatus("inactive");
    }, []);

    const start = useCallback((onFailure?: (reason: GeolocationFailure) => void) => {
        onFailureRef.current = onFailure ?? null;

        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
            setStatus("unavailable");
            onFailureRef.current?.("unavailable");
            return;
        }
        if (watchIdRef.current !== null) return;

        setStatus("watching");
        watchIdRef.current = navigator.geolocation.watchPosition(
            (browserPosition) => {
                setPosition({
                    latitude: browserPosition.coords.latitude,
                    longitude: browserPosition.coords.longitude,
                    accuracy: browserPosition.coords.accuracy,
                });
                setStatus("watching");
            },
            (error) => {
                if (error.code === error.TIMEOUT) return;

                const reason: GeolocationFailure =
                    error.code === error.PERMISSION_DENIED ? "denied" : "unavailable";
                setStatus(reason);
                onFailureRef.current?.(reason);
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            },
            WATCH_OPTIONS,
        );
    }, []);

    useEffect(() => stop, [stop]);

    return { status, position, start, stop };
}
