"use client";
import { useCallback, useSyncExternalStore } from "react";

type PwaInstallStatus = "unknown" | "dismissed" | "installed";

interface BeforeInstallPromptEvent extends Event {
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt(): Promise<void>;
}

const STORAGE_KEY = "urbanflow.pwa.install";

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let windowBound = false;

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

function persistStatus(status: PwaInstallStatus): void {
    window.localStorage.setItem(STORAGE_KEY, status);
    emit();
}

function bindWindow(): void {
    if (windowBound) return;
    windowBound = true;

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        emit();
    });

    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        persistStatus("installed");
    });
}

function subscribe(listener: () => void): () => void {
    bindWindow();
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

function getStatusSnapshot(): PwaInstallStatus {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dismissed" || stored === "installed" ? stored : "unknown";
}

function getCanPromptSnapshot(): boolean {
    return deferredPrompt !== null;
}

function getStandaloneSnapshot(): boolean {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const mediaMatch = window.matchMedia?.("(display-mode: standalone)");
    return (mediaMatch?.matches ?? false) || nav.standalone === true;
}

function getIOSSnapshot(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

const serverFalse = (): boolean => false;
const serverUnknown = (): PwaInstallStatus => "unknown";

export function usePwaInstall() {
    const status = useSyncExternalStore(subscribe, getStatusSnapshot, serverUnknown);
    const canPrompt = useSyncExternalStore(subscribe, getCanPromptSnapshot, serverFalse);
    const isStandalone = useSyncExternalStore(subscribe, getStandaloneSnapshot, serverFalse);
    const isIOS = useSyncExternalStore(subscribe, getIOSSnapshot, serverFalse);

    const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | null> => {
        if (!deferredPrompt) return null;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        persistStatus(outcome === "accepted" ? "installed" : "dismissed");
        return outcome;
    }, []);

    const dismiss = useCallback(() => persistStatus("dismissed"), []);

    const canInstall = !isStandalone && (canPrompt || isIOS);

    return {
        status,
        canPrompt,
        isIOS,
        isStandalone,
        canInstall,
        shouldShowBanner: canInstall && status === "unknown",
        promptInstall,
        dismiss,
    };
}