"use client";

import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";

interface ShareConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function ShareConsentDialog({ open, onOpenChange, onAccept }: ShareConsentDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Partager ton trajet"
      description="Ton proche verra l'avancement du trajet et l'heure d'arrivée prévue. Quand l'app est ouverte, il verra aussi l'arrêt le plus proche de toi : ta dernière position est alors envoyée à nos serveurs, puis effacée à la fin du partage. Le partage s'arrête quand tu confirmes ton arrivée, ou une heure après l'arrivée prévue. Toute personne qui a le lien voit ces informations."
    >
      <div className="flex gap-2.5">
        <Button variant="inset" onClick={() => onOpenChange(false)} className="h-[52px] flex-1">
          Annuler
        </Button>
        <Button variant="primary" onClick={onAccept} className="flex-1">
          Accepter
        </Button>
      </div>
    </Modal>
  );
}
