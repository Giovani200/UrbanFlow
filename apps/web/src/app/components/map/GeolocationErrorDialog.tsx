"use client";
import { Modal } from "@/app/components/ui/Modal";

type GeolocationErrorVariant = "denied" | "unavailable";

interface GeolocationErrorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant: GeolocationErrorVariant;
}

const MESSAGES: Record<GeolocationErrorVariant, { title: string; description: string }> = {
    denied: {
        title: "Géolocalisation bloquée",
        description: "Vous avez refusé l'accès à votre position. Réactivez la géolocalisation dans les paramètres pour utiliser votre position actuelle.",
    },
    unavailable: {
        title: "Position indisponible",
        description: "Votre appareil n'a pas pu déterminer votre position pour le moment. Vérifiez votre connexion ou réessayez dans un instant. Vous pouvez inscrire directement votre dresse",
    },
};

export function GeolocationErrorDialog({open, onOpenChange, variant }: GeolocationErrorDialogProps) {
    const { title, description } = MESSAGES[variant];

    return (
        <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
            <button
                onClick={() => onOpenChange(false)} className="w-full rounded-lg py-2.5 font-semibold text-sm bg-primary text-white"
            >
                Compris
            </button>
        </Modal>
    );
}