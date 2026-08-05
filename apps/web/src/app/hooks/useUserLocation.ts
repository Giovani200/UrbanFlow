"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useGeolocation } from "@/app/hooks/useGeolocation";
import type { GeolocationFailure, UserPosition } from "@/app/hooks/useGeolocation";
import { useGeolocationPermission } from "@/app/hooks/useGeolocationPermission";
import { useGeolocationConsent } from "@/app/hooks/useGeolocationConsent";
import { readLastPosition, writeLastPosition, clearLastPosition } from "@/app/lib/lastPosition";

export type UserLocation =
    | { state: "idle" }
    | { state: "asking" }
    | { state: "locating" }
    | { state: "located"; position: UserPosition };

export interface UseUserLocation {
    location: UserLocation;
    failure: GeolocationFailure | null;
    request: () => void;
    acceptConsent: () => void;
    refuseConsent: () => void;
    dismissAsking: () => void;
    dismissFailure: () => void;
}

type EffectiveAccess = "granted" | "prompt" | "denied";

//  garde une référence stable pour useSyncExternalStore, et reste null
let cachedSeed: UserPosition | null | undefined;
function seedSnapshot(): UserPosition | null {
    if (cachedSeed === undefined) cachedSeed = readLastPosition();
    return cachedSeed;
}
const serverSeed = (): null => null;
const neverChanges = (): (() => void) => () => {};

export function useUserLocation(): UseUserLocation {
    const { status, position, start, stop } = useGeolocation();
    const permission = useGeolocationPermission();
    const { consent, grant, deny } = useGeolocationConsent();
    const seed = useSyncExternalStore(neverChanges, seedSnapshot, serverSeed);

    const [asking, setAsking] = useState(false);
    const [failure, setFailure] = useState<GeolocationFailure | null>(null);
    const startedRef = useRef(false);

    // La permission navigateur fait foi. Absente (Safari < 16), on retombe sur le consentement stocké localement.
    const access: EffectiveAccess =
        permission !== "unknown"
            ? permission
            : consent === "granted"
                ? "granted"
                : consent === "denied"
                    ? "denied"
                    : "prompt";

    const watch = useCallback(() => {
        startedRef.current = true;
        setFailure(null);
        start(setFailure);
    }, [start]);

    useEffect(() => {
        if (startedRef.current || access !== "granted") return;
        startedRef.current = true;
        start();
    }, [access, start]);

    useEffect(() => {
        if (position) writeLastPosition(position);
    }, [position]);

    useEffect(() => {
        if (access === "denied") clearLastPosition();
    }, [access]);

    const request = useCallback(() => {
        if (access === "granted") {
            watch();
            return;
        }
        if (access === "denied") {
            setFailure("denied");
            return;
        }
        setAsking(true);
    }, [access, watch]);

    const acceptConsent = useCallback(() => {
        grant();
        setAsking(false);
        watch();
    }, [grant, watch]);

    const refuseConsent = useCallback(() => {
        deny();
        setAsking(false);
        clearLastPosition();
        stop();
    }, [deny, stop]);

    const dismissAsking = useCallback(() => setAsking(false), []);
    const dismissFailure = useCallback(() => setFailure(null), []);

    const location = useMemo<UserLocation>(() => {
        const shown = position ?? (access === "granted" ? seed : null);
        if (shown) return { state: "located", position: shown };
        if (asking) return { state: "asking" };
        if (status === "watching") return { state: "locating" };
        return { state: "idle" };
    }, [position, access, seed, asking, status]);

    return { location, failure, request, acceptConsent, refuseConsent, dismissAsking, dismissFailure };
}