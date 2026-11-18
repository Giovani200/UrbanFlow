"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShareStep, ShareViewDtoOut } from "@urbanflow/app-front-back-lib";
import { ConnectionVerdictTag } from "@/app/components/planner/ConnectionVerdictTag";
import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";
import { useVisibleInterval } from "@/app/hooks/useVisibleInterval";
import { formatParisClock } from "@/app/lib/format";
import { INVALID_LINK_HEADLINE, LEVEL_WORDS, lastPositionText, stateHeadline, stepTitle } from "@/app/lib/share-wording";
import { sharesService } from "@/app/services/shares.service";

const REFRESH_INTERVAL_MILLISECONDS = 60_000;
const SHARE_NOT_FOUND = "SHARE_NOT_FOUND";

const BODY = "[font:var(--uf-body)]";
const NOTE = "[font:var(--uf-note)]";
const CHIP = `inline-flex min-h-[26px] items-center rounded-[13px] border border-uf-ink/20 bg-uf-inset px-2.5 ${NOTE} font-bold`;

type LoadState = { kind: "loading" } | { kind: "invalid" } | { kind: "ready"; view: ShareViewDtoOut };

function isFinished(state: LoadState): boolean {
  return state.kind === "invalid" || (state.kind === "ready" && state.view.state !== "in_progress" && state.view.state !== "arrival_unconfirmed");
}

function StepItem({ step, isCurrent }: { step: ShareStep; isCurrent: boolean }) {
  return (
    <li aria-current={isCurrent ? "step" : undefined} className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3">
      <span className="text-right [font:var(--uf-time)] tabular-nums">{step.time ? formatParisClock(step.time) : ""}</span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className={`${BODY} ${isCurrent ? "font-bold" : ""}`}>
          {step.kind === "arrive" ? `Arrivée · ${stepTitle(step, isCurrent)}` : stepTitle(step, isCurrent)}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {isCurrent && <span className={`${CHIP} border-uf-ink`}>en cours</span>}
          <span className={CHIP}>{LEVEL_WORDS[step.level]}</span>
          {step.freshness && <FreshnessStamp freshness={step.freshness} />}
          {step.kind === "connection" && <ConnectionVerdictTag verdict={step.verdict} />}
        </span>
      </span>
    </li>
  );
}

function SharedTrip({ view, isStale }: { view: ShareViewDtoOut; isStale: boolean }) {
  const name = view.sharerFirstName ?? "ton proche";
  return (
    <>
      <GlassPanel as="section" aria-labelledby="etat-partage" className="flex flex-col gap-2 p-5">
        <h2 id="etat-partage" aria-live="polite" className="[font:var(--uf-time)]">
          {stateHeadline(view)}
        </h2>
        {view.estimatedArrival && view.state === "in_progress" && (
          <p className={`flex flex-wrap items-center gap-2 ${BODY}`}>
            Arrivée prévue à{" "}
            <span className="[font:var(--uf-time)] tabular-nums">{formatParisClock(view.estimatedArrival.time)}</span>
            <FreshnessStamp freshness={view.estimatedArrival.freshness} />
          </p>
        )}
        {view.lastPosition && <p className={BODY}>{lastPositionText(view.lastPosition)}</p>}
        {isStale && <p role="status" className={`${BODY} font-bold`}>Connexion perdue : informations de la dernière mise à jour.</p>}
      </GlassPanel>

      {view.steps.length > 0 && (
        <GlassPanel as="section" aria-labelledby="etapes-partage" className="flex flex-col gap-4 p-5">
          <h2 id="etapes-partage" className={`${BODY} font-bold`}>Le trajet</h2>
          <ol className="flex flex-col gap-3">
            {view.steps.map((step, index) => (
              <StepItem key={`${step.kind}-${index}`} step={step} isCurrent={index === view.currentStepIndex} />
            ))}
          </ol>
          <p className={`${NOTE} text-uf-ink-2`}>
            Les étapes « prévu » sont déduites de l&apos;itinéraire et du temps réel. Seules les étapes « confirmé » viennent du
            téléphone de {name}.
          </p>
        </GlassPanel>
      )}
    </>
  );
}

/** La page du proche : sans compte, le jeton du fragment d'URL suffit. Elle ne se met à jour que visible. */
export function SharedTripView() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- le fragment d'URL n'existe que dans le navigateur
    if (fragment) setToken(fragment);
    else setState({ kind: "invalid" });
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const result = await sharesService.view(token);
    if (result.isOk) {
      setState({ kind: "ready", view: result.data });
      setIsStale(false);
    } else if (result.error === SHARE_NOT_FOUND) {
      setState({ kind: "invalid" });
    } else {
      setIsStale(true);
    }
  }, [token]);

  useVisibleInterval(refresh, REFRESH_INTERVAL_MILLISECONDS, token !== null && !isFinished(state));

  return (
    <PageShell title="Trajet partagé">
      {state.kind === "loading" && (
        <p role="status" className={BODY}>
          {isStale ? "Trajet indisponible pour le moment. Nouvel essai dans une minute." : "Chargement du trajet…"}
        </p>
      )}
      {state.kind === "invalid" && (
        <GlassPanel as="section" className="p-5">
          <h2 className="[font:var(--uf-time)]">{INVALID_LINK_HEADLINE}</h2>
        </GlassPanel>
      )}
      {state.kind === "ready" && <SharedTrip view={state.view} isStale={isStale} />}
    </PageShell>
  );
}
