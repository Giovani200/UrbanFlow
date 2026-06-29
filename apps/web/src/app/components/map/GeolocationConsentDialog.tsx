"use client";

import { Modal } from "@/app/components/ui/Modal";

interface GeolocationConsentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccept: () => void;
    onRefuse: () => void;
}

export function GeolocationConsentDialog(
    {
        open,
        onOpenChange,
        onAccept,
        onRefuse,
    }: GeolocationConsentDialogProps) {
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Utiliser votre position"
            description="UrbanFlow utilise votre position pour centrer la carte et calculer vos itinéraires depuis l'endroit où vous êtes. Elle reste sur votre appareil et n'est jamais enregistrée sur nos serveurs."
        >
            <div className="flex gap-2.5">
                <button
                    onClick={onRefuse}
                    className="flex-1 rounded-lg py-2.5 font-semibold text-sm border border-uf-border text-uf-text"
                >
                    Refuser
                </button>
                <button
                    onClick={onAccept}
                    className="flex-1 rounded-lg py-2.5 font-semibold text-sm bg-uf-red text-white"
                >
                    Accepter
                </button>
            </div>
        </Modal>
    );
}