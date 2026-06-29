"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationStatus = "inactive" | "watching" | "denied" | "unavailable";

export interface UserPosition {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface UseGeolocation {
    status: GeolocationStatus;
    position: UserPosition | null;
    start: () => void;
    stop: () => void;
}

const WATCH_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
};

export function useGeolocation(): UseGeolocation {
    const [status, setStatus] = useState<GeolocationStatus>("inactive");
    const [position, setPosition] = useState<UserPosition | null>(null);
    const watchIdRef = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setStatus("inactive");
    }, []);

    const start = useCallback(() => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
            setStatus("unavailable");
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
                setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            },
            WATCH_OPTIONS,
        );
    }, []);

    useEffect(() => stop, [stop]); // cleanup à l'unmount

    return { status, position, start, stop };
}