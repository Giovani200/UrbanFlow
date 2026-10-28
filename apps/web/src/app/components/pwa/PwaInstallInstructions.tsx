"use client";
import { Share } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
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
            <ol className="mb-5 flex flex-col gap-3">
                {STEPS.map((step, i) => (
                    <li key={step} className="flex items-center gap-3">
                        <span className="uf-inset flex size-7 shrink-0 items-center justify-center rounded-full [font:var(--uf-note)] tabular-nums">
                            {i + 1}
                        </span>
                        <span className="flex-1 [font:var(--uf-body)] font-medium">{step}</span>
                        {i === 0 && <Share size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />}
                    </li>
                ))}
            </ol>
            <Button variant="primary" onClick={() => onOpenChange(false)} className="w-full">
                J&apos;ai compris
            </Button>
        </Modal>
    );
}