"use client";

import { useEffect, useState } from "react";

// "unknown" = Permissions API absente (Safari < 16) ou nom non supporté.
// Dans ce cas, useUserLocation retombe sur le consentement localStorage.
export type GeolocationPermission = "granted" | "prompt" | "denied" | "unknown";

export function useGeolocationPermission(): GeolocationPermission {
    const [permission, setPermission] = useState<GeolocationPermission>("unknown");

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

        let status: PermissionStatus | null = null;
        const syncState = () => {
            if (status) setPermission(status.state);
        };

        navigator.permissions
            .query({ name: "geolocation" })
            .then((result) => {
                status = result;
                setPermission(result.state);
                result.addEventListener("change", syncState);
            })
            .catch(() => {
            });

        return () => {
            status?.removeEventListener("change", syncState);
        };
    }, []);

    return permission;
}