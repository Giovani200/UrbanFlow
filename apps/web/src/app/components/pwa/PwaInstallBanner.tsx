"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/app/hooks/usePwaInstall";
import { PwaInstallInstructions } from "./PwaInstallInstructions";

export function PwaInstallBanner() {
    const { shouldShowBanner, isIOS, promptInstall, dismiss } = usePwaInstall();
    const [visible, setVisible] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        if (!shouldShowBanner) return;
        const id = requestAnimationFrame(() =>
            requestAnimationFrame(() => setVisible(true))
        );
        return () => cancelAnimationFrame(id);
    }, [shouldShowBanner]);

    if (!shouldShowBanner) return null;

    function close() {
        setVisible(false);
        setTimeout(dismiss, 280);
    }

    async function handleInstall() {
        if (isIOS) {
            setShowInstructions(true);
            return;
        }
        await promptInstall();
    }

    return (
        <>
            <div
                role="region"
                aria-label="Installer l'application"
                className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border rounded-t-2xl shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
                }}
            >
                <div className="mx-auto w-full max-w-md">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                            <Download size={20} strokeWidth={1.75} color="white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-bold text-ink">Installer UrbanFlow</p>
                            <p className="mt-0.5 text-xs text-text-2">Accès rapide, hors-ligne, plein écran.</p>
                        </div>
                        <button
                            onClick={close}
                            aria-label="Fermer"
                            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-text-2 shrink-0"
                        >
                            <X size={18} strokeWidth={1.75} />
                        </button>
                    </div>

                    <div className="mt-3 flex gap-2.5">
                        <button
                            onClick={close}
                            className="flex-1 rounded-lg py-2.5 font-semibold text-sm border border-border text-ink"
                        >
                            Plus tard
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 rounded-lg py-2.5 font-semibold text-sm bg-primary text-white"
                        >
                            Installer
                        </button>
                    </div>
                </div>
            </div>

            <PwaInstallInstructions
                open={showInstructions}
                onOpenChange={(open) => {
                    setShowInstructions(open);
                    if (!open) close();
                }}
            />
        </>
    );
}