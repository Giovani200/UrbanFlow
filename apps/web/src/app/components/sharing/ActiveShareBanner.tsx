"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import type { ActiveShare } from "@/app/hooks/useActiveShare";

const BODY = "[font:var(--uf-body)]";

interface ActiveShareBannerProps {
  share: ActiveShare;
  onConfirmArrival: () => Promise<boolean>;
  onStop: () => Promise<boolean>;
}

/** Un partage actif reste toujours visible pour la personne qui partage, avec de quoi l'arrêter. */
export function ActiveShareBanner({ share, onConfirmArrival, onStop }: ActiveShareBannerProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function run(action: () => Promise<boolean>) {
    setIsBusy(true);
    setHasFailed(!(await action()));
    setIsBusy(false);
  }

  return (
    <section aria-labelledby="partage-actif" className="uf-inset flex flex-col gap-3 rounded-uf-panel px-5 py-4">
      <h2 id="partage-actif" className={`${BODY} font-bold`}>
        Ton trajet vers {share.destinationLabel} est partagé.
      </h2>
      {hasFailed && <p role="alert" className={BODY}>Action impossible pour le moment. Réessaie dans un instant.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="inset" disabled={isBusy} onClick={() => void run(onConfirmArrival)}>
          Confirmer mon arrivée
        </Button>
        <Button variant="text" disabled={isBusy} onClick={() => void run(onStop)}>
          Arrêter le partage
        </Button>
      </div>
    </section>
  );
}
