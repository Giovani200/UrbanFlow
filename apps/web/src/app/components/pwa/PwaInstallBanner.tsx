"use client";
import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { usePwaInstall } from "@/app/hooks/usePwaInstall";
import { PwaInstallInstructions } from "./PwaInstallInstructions";

/** Proposition d'installation, posée en bas de l'écran sans animation (le design n'en garde qu'une par écran). */
export function PwaInstallBanner() {
    const { shouldShowBanner, isIOS, promptInstall, dismiss } = usePwaInstall();
    const [showInstructions, setShowInstructions] = useState(false);

    if (!shouldShowBanner) return null;

    async function handleInstall() {
        if (isIOS) {
            setShowInstructions(true);
            return;
        }
        await promptInstall();
    }

    return (
        <>
            <div className="fixed right-0 bottom-0 left-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <GlassPanel as="aside" aria-label="Installer l'application" className="mx-auto flex w-full max-w-md flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-uf-avatar bg-uf-ink text-uf-on-ink">
                            <Download size={20} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="[font:var(--uf-time)]">Installer UrbanFlow</p>
                            <p className="[font:var(--uf-note)] text-uf-ink-2">Accès rapide, hors ligne, plein écran.</p>
                        </div>
                        <button type="button" onClick={dismiss} aria-label="Fermer" className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full">
                            <X size={18} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="flex gap-2.5">
                        <Button variant="inset" onClick={dismiss} className="flex-1">
                            Plus tard
                        </Button>
                        <Button variant="primary" onClick={handleInstall} className="h-11 flex-1">
                            Installer
                        </Button>
                    </div>
                </GlassPanel>
            </div>

            <PwaInstallInstructions
                open={showInstructions}
                onOpenChange={(open) => {
                    setShowInstructions(open);
                    if (!open) dismiss();
                }}
            />
        </>
    );
}
