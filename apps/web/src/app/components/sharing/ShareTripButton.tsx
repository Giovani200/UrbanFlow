"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { sendShareLink, shareUrl, type ShareLink, type ShareLinkOutcome } from "@/app/lib/share-link";
import { SHARE_CONSENT_REQUIRED, sharesService, type CreateShareDtoIn } from "@/app/services/shares.service";
import { usersService } from "@/app/services/users.service";
import { ShareConsentDialog } from "./ShareConsentDialog";

const BODY = "[font:var(--uf-body)]";
const GENERIC_ERROR = "Partage impossible pour le moment. Réessaie dans un instant.";

const CREATION_ERRORS: Record<string, string> = {
  ROUTINE_NOT_RUNNING: "Ce trajet ne circule pas aujourd'hui, il ne peut pas être partagé.",
  ITINERARY_WITHOUT_TIMES: "Ce trajet n'a pas d'horaires, il ne peut pas être partagé.",
};

const OUTCOME_MESSAGES: Record<ShareLinkOutcome, string | null> = {
  shared: "Lien envoyé.",
  copied: "Lien copié.",
  cancelled: null,
  failed: "Envoi impossible. Copie ce lien :",
};

interface ShareTripButtonProps {
  source: CreateShareDtoIn["source"];
  destinationLabel: string;
  onShared: () => void;
}

/**
 * Deux temps : créer le lien, puis l'envoyer. La feuille de partage exige un clic récent, qu'un appel réseau
 * (et parfois le consentement) aurait épuisé si tout se faisait d'un seul geste.
 */
export function ShareTripButton({ source, destinationLabel, onShared }: ShareTripButtonProps) {
  const [link, setLink] = useState<ShareLink | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isAskingConsent, setIsAskingConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSendFailed, setHasSendFailed] = useState(false);

  async function createLink() {
    setIsBusy(true);
    setMessage(null);
    const result = await sharesService.create(source);
    setIsBusy(false);
    if (result.isOk) {
      setLink({ url: shareUrl(window.location.origin, result.data.token), text: `Suis mon trajet vers ${destinationLabel}` });
      onShared();
      return;
    }
    if (result.error === SHARE_CONSENT_REQUIRED) {
      setIsAskingConsent(true);
      return;
    }
    setMessage(CREATION_ERRORS[result.error] ?? GENERIC_ERROR);
  }

  async function acceptConsent() {
    setIsAskingConsent(false);
    const result = await usersService.recordShareConsent();
    if (!result.isOk) {
      setMessage(GENERIC_ERROR);
      return;
    }
    await createLink();
  }

  async function sendLink() {
    if (!link) return;
    const outcome = await sendShareLink(link, {
      share: typeof navigator.share === "function" ? (data) => navigator.share(data) : undefined,
      clipboard: navigator.clipboard,
    });
    setHasSendFailed(outcome === "failed");
    setMessage(OUTCOME_MESSAGES[outcome]);
  }

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      {link ? (
        <Button variant="inset" onClick={() => void sendLink()}>
          <Share2 size={16} aria-hidden="true" />
          Envoyer le lien
        </Button>
      ) : (
        <Button variant="inset" disabled={isBusy} onClick={() => void createLink()}>
          <Share2 size={16} aria-hidden="true" />
          {isBusy ? "Création du lien…" : "Partager ce trajet"}
        </Button>
      )}
      <p role="status" className={`${BODY} font-bold empty:hidden`}>{message}</p>
      {hasSendFailed && link && <p className={`${BODY} select-all break-all`}>{link.url}</p>}
      <ShareConsentDialog open={isAskingConsent} onOpenChange={setIsAskingConsent} onAccept={() => void acceptConsent()} />
    </div>
  );
}
