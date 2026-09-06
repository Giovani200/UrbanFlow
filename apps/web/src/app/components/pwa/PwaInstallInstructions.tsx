"use client";
import { Share } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";

interface PwaInstallInstructionsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STEPS = [
    "Touchez l'icône Partager dans la barre de Safari.",
    "Faites défiler puis choisissez « Sur l'écran d'accueil ».",
    "Confirmez avec « Ajouter ».",
];

export function PwaInstallInstructions({ open, onOpenChange }: PwaInstallInstructionsProps) {
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Installer UrbanFlow"
            description="Ajoutez UrbanFlow à votre écran d'accueil pour un accès rapide, hors-ligne et en plein écran."
        >
            <ol className="flex flex-col gap-3 mb-4">
                {STEPS.map((step, i) => (
                    <li key={step} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-bg text-ink text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-ink">{step}</span>
                        {i === 0 && <Share size={18} strokeWidth={1.75} className="shrink-0 text-text-2" />}
                    </li>
                ))}
            </ol>
            <button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-lg py-2.5 font-semibold text-sm bg-primary text-white"
            >
                J&apos;ai compris
            </button>
        </Modal>
    );
}