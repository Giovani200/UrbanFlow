"use client";

import { Button } from "@/app/components/ui/Button";
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
            description="UrbanFlow utilise votre position pour centrer la carte et calculer vos itinéraires depuis l'endroit où vous êtes. Elle n'est conservée que comme point de départ d'un trajet enregistré ou d'une routine recalculée, et pendant un trajet que vous partagez, où seule votre dernière position est gardée jusqu'à la fin du partage. Le détail figure dans la politique de confidentialité."
        >
            <div className="flex gap-2.5">
                <Button variant="inset" onClick={onRefuse} className="h-[52px] flex-1">
                    Refuser
                </Button>
                <Button variant="primary" onClick={onAccept} className="flex-1">
                    Accepter
                </Button>
            </div>
        </Modal>
    );
}