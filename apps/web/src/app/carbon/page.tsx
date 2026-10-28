"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, Target } from "lucide-react";
import type { CarbonSummaryDtoOut, Period } from "@urbanflow/app-front-back-lib";
import { buttonClassName } from "@/app/components/ui/Button";
import { ChoiceChip } from "@/app/components/ui/ChoiceChip";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";
import { useCarbonSummary } from "@/app/hooks/useCarbonSummary";
import { formatKilograms } from "@/app/lib/format";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";

const PERIODS: { id: Period; label: string; savedLabel: string }[] = [
  { id: "week", label: "Semaine", savedLabel: "cette semaine" },
  { id: "month", label: "Mois", savedLabel: "ce mois" },
  { id: "year", label: "Année", savedLabel: "cette année" },
];

const SOLID_BAR = "bg-uf-ink";
const HATCHED_BAR = "border border-uf-ink bg-[repeating-linear-gradient(135deg,var(--uf-ink)_0_2px,transparent_2px_6px)]";

function formatCarbon(grams: number): string {
  return grams < 1000 ? `${Math.round(grams)} g` : `${formatKilograms(grams)} kg`;
}

export default function CarbonPage() {
  const [period, setPeriod] = useState<Period>("month");
  const { summary, loading, isAnonymous } = useCarbonSummary(period);
  const periodMeta = PERIODS.find((entry) => entry.id === period) ?? PERIODS[1];
  const hasTrips = summary !== null && summary.tripCount > 0;

  return (
    <PageShell title="Mon empreinte">
      <GlassPanel as="section" aria-label="Bilan" className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((entry) => (
            <ChoiceChip key={entry.id} selected={period === entry.id} onClick={() => setPeriod(entry.id)}>
              {entry.label}
            </ChoiceChip>
          ))}
        </div>

        {loading && (
          <p role="status" className="[font:var(--uf-body)] font-medium text-uf-ink-2">
            Chargement…
          </p>
        )}

        {!loading && !hasTrips && <EmptyState isAnonymous={isAnonymous} />}

        {!loading && hasTrips && (
          <>
            {isAnonymous && <AnonymousNotice tripCount={summary.tripCount} />}
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="[font:var(--uf-note)] text-uf-ink-2">CO₂ économisé {periodMeta.savedLabel}</p>
              <p className="[font:var(--uf-title)] text-[54px] leading-none tabular-nums">{formatKilograms(summary.totalSavedGrams)}</p>
              <p className="[font:var(--uf-body)] text-uf-ink-2">kg CO₂e</p>
              <p className="uf-inset mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 [font:var(--uf-note)]">
                <Leaf size={16} aria-hidden="true" />
                {Math.round(summary.savedPercent)} % de moins qu&apos;en voiture
              </p>
              <p className="mt-1 [font:var(--uf-note)] text-uf-ink-2">
                Comme si tu avais évité <span className="text-uf-ink tabular-nums">{Math.round(summary.equivalentCarKm)} km</span> en
                voiture.
              </p>
            </div>
          </>
        )}
      </GlassPanel>

      {!loading && hasTrips && (
        <>
          <BucketChart buckets={summary.buckets} />
          {summary.byMode.length > 0 && <ModeBreakdown byMode={summary.byMode} />}
          {summary.goal && <GoalCard goal={summary.goal} />}
        </>
      )}
    </PageShell>
  );
}

function EmptyState({ isAnonymous }: { isAnonymous: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Leaf size={28} aria-hidden="true" />
      <p className="[font:var(--uf-time)]">Aucun trajet enregistré</p>
      <p className="max-w-[280px] [font:var(--uf-body)] font-medium text-uf-ink-2">
        Planifie un trajet, suis-le, et marque-le comme fait à l&apos;arrivée pour suivre ton empreinte carbone.
      </p>
      {isAnonymous && (
        <p className="[font:var(--uf-note)] text-uf-ink-2">
          Tes trajets sont gardés sur cet appareil (10 au plus). Connecte-toi pour l&apos;historique complet.
        </p>
      )}
    </div>
  );
}

function AnonymousNotice({ tripCount }: { tripCount: number }) {
  return (
    <div className="uf-inset flex items-center gap-3 rounded-uf-inset py-2 pr-2 pl-4">
      <div className="flex-1">
        <p className="[font:var(--uf-note)]">Tes {tripCount} derniers trajets sur cet appareil</p>
        <p className="[font:var(--uf-note)] text-uf-ink-2">Connecte-toi pour l&apos;historique complet et tes objectifs.</p>
      </div>
      <Link href="/auth/login" className={buttonClassName("text", "shrink-0")}>
        Se connecter
      </Link>
    </div>
  );
}

function BucketChart({ buckets }: { buckets: CarbonSummaryDtoOut["buckets"] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.carbonGrams), 1);
  return (
    <GlassPanel as="section" aria-labelledby="emissions" className="flex flex-col gap-3 p-5">
      <div>
        <h2 id="emissions" className="[font:var(--uf-time)]">Ce que tes trajets ont émis</h2>
        <p className="[font:var(--uf-note)] text-uf-ink-2">Plus la barre est basse, moins tu as émis.</p>
      </div>
      <ul className="flex h-24 items-end gap-1.5">
        {buckets.map((bucket, index) => {
          const performing = bucket.carbonGrams <= bucket.savedGrams;
          return (
            <li key={index} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] font-semibold text-uf-ink-2 tabular-nums">{formatCarbon(bucket.carbonGrams)}</span>
              <span
                aria-hidden="true"
                className={`min-h-1 w-full rounded-t-[3px] ${performing ? SOLID_BAR : HATCHED_BAR}`}
                style={{ height: `${(bucket.carbonGrams / max) * 60}px` }}
              />
              <span className="text-[11px] font-semibold">{bucket.label}</span>
              <span className="sr-only">{performing ? "performant" : "à améliorer"}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-4 [font:var(--uf-note)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-3 rounded-[2px] ${SOLID_BAR}`} />
          Performant
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-3 rounded-[2px] ${HATCHED_BAR}`} />
          À améliorer
        </span>
      </div>
    </GlassPanel>
  );
}

function ModeBreakdown({ byMode }: { byMode: CarbonSummaryDtoOut["byMode"] }) {
  return (
    <GlassPanel as="section" aria-labelledby="origine" className="flex flex-col gap-3 p-5">
      <div>
        <h2 id="origine" className="[font:var(--uf-time)]">D&apos;où viennent tes émissions</h2>
        <p className="[font:var(--uf-note)] text-uf-ink-2">Marche et vélo n&apos;émettent rien : ils restent à 0 %.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {byMode.map((entry) => {
          const meta = MODE_META[entry.mode] ?? MODE_FALLBACK;
          const Icon = meta.icon;
          const percent = Math.round(entry.percent);
          return (
            <li key={entry.mode} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between [font:var(--uf-note)]">
                <span className="flex items-center gap-1.5">
                  <Icon size={16} aria-hidden="true" style={{ color: meta.color }} />
                  {meta.label}
                </span>
                <span className="tabular-nums">{percent} %</span>
              </div>
              <div className="uf-inset h-2 overflow-hidden rounded-full" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: meta.color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}

function GoalCard({ goal }: { goal: NonNullable<CarbonSummaryDtoOut["goal"]> }) {
  const percent = Math.round(goal.percent);
  return (
    <GlassPanel as="section" aria-labelledby="objectif" className="flex flex-col gap-2.5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="objectif" className="[font:var(--uf-time)]">Objectif du mois</h2>
        <span className="flex items-center gap-1 [font:var(--uf-note)] tabular-nums">
          <Target size={16} aria-hidden="true" />
          {goal.targetKg} kg à économiser
        </span>
      </div>
      <div className="uf-inset h-2.5 overflow-hidden rounded-full" aria-hidden="true">
        <div className="h-full rounded-full bg-uf-ink" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="flex justify-between [font:var(--uf-note)] tabular-nums">
        <span className="text-uf-ink-2">{goal.achievedKg.toFixed(1).replace(".", ",")} kg économisés</span>
        <span>{percent} % atteint</span>
      </div>
    </GlassPanel>
  );
}
