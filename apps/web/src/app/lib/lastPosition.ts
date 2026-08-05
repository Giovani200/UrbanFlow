import type { UserPosition } from "@/app/hooks/useGeolocation";

const STORAGE_KEY = "urbanflow.geolocation.last-position";

export function readLastPosition(): UserPosition | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<UserPosition>;
        if (
            typeof parsed.latitude === "number" &&
            typeof parsed.longitude === "number" &&
            typeof parsed.accuracy === "number"
        ) {
            return { latitude: parsed.latitude, longitude: parsed.longitude, accuracy: parsed.accuracy };
        }
        return null;
    } catch {
        return null;
    }
}

export function writeLastPosition(position: UserPosition): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
    }
}

export function clearLastPosition(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
}
