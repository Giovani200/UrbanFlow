"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Target } from "lucide-react";
import type { CarbonSummaryDtoOut, Period } from "@urbanflow/app-front-back-lib";
import { useCarbonSummary } from "@/app/hooks/useCarbonSummary";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";

const PERIODS: { id: Period; label: string; savedLabel: string }[] = [
  { id: "week", label: "Semaine", savedLabel: "cette semaine" },
  { id: "month", label: "Mois", savedLabel: "ce mois" },
  { id: "year", label: "Année", savedLabel: "cette année" },
];

function formatKg(grams: number): string {
  return (grams / 1000).toFixed(1).replace(".", ",");
}

function formatCarbon(grams: number): string {
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toFixed(1).replace(".", ",")} kg`;
}

export default function CarbonPage() {
  const [period, setPeriod] = useState<Period>("month");
  const router = useRouter();
  const { summary, loading, isAnonymous } = useCarbonSummary(period);
  const periodMeta = PERIODS.find((entry) => entry.id === period) ?? PERIODS[1];

  return (
    <div className="flex flex-col h-dvh bg-bg font-sans">
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">Mon empreinte</h1>
        <Leaf size={18} className="text-success" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        <div className="flex bg-white rounded-[10px] p-1 border border-border">
          {PERIODS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setPeriod(entry.id)}
              className={`flex-1 py-2 rounded-lg text-[13px] transition-colors ${
                period === entry.id ? "bg-primary text-white font-semibold" : "text-text-2"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Placeholder text="Chargement…" />
        ) : !summary || summary.tripCount === 0 ? (
          <EmptyState isAnonymous={isAnonymous} />
        ) : (
          <>
            {isAnonymous && (
              <AnonymousBanner tripCount={summary.tripCount} onLogin={() => router.push("/auth/login")} />
            )}

            <div className="bg-white rounded-xl px-5 py-5 text-center">
              <p className="text-[12px] font-semibold text-text-2 mb-2">
                CO₂ économisé {periodMeta.savedLabel}
              </p>
              <p className="font-mono text-[54px] font-bold text-ink leading-none tracking-tight">
                {formatKg(summary.totalSavedGrams)}
              </p>
              <p className="text-[14px] text-text-2 mt-1 mb-3.5">kg CO₂eq</p>
              <div className="inline-flex items-center gap-1.5 bg-green-50 rounded-[10px] px-3.5 py-1.5">
                <Leaf size={14} className="text-success" />
                <span className="text-[13px] font-semibold text-success">
                  {Math.round(summary.savedPercent)}% de moins qu&apos;en voiture
                </span>
              </div>
              <p className="text-[12px] text-text-2 mt-2.5">
                Comme si tu avais évité{" "}
                <span className="font-semibold text-ink">{Math.round(summary.equivalentCarKm)} km</span> en voiture.
              </p>
            </div>

            <BucketChart buckets={summary.buckets} />

            {summary.byMode.length > 0 && <ModeBreakdown byMode={summary.byMode} />}

            {summary.goal && <GoalCard goal={summary.goal} />}
          </>
        )}
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="bg-white rounded-xl px-5 py-10 text-center text-[13px] text-text-2">{text}</div>;
}

function EmptyState({ isAnonymous }: { isAnonymous: boolean }) {
  return (
    <div className="bg-white rounded-xl px-5 py-10 text-center flex flex-col items-center gap-3">
      <Leaf size={28} className="text-text-2" />
      <p className="text-[15px] font-semibold text-ink">Aucun trajet enregistré</p>
      <p className="text-[13px] text-text-2 leading-relaxed max-w-[280px]">
        Planifie un trajet, suis-le, et marque-le comme fait à l&apos;arrivée pour suivre ton empreinte carbone.
      </p>
      {isAnonymous && (
        <p className="text-[12px] text-text-2">
          Tes trajets sont gardés sur cet appareil (10 max). Connecte-toi pour l&apos;historique complet.
        </p>
      )}
    </div>
  );
}

function AnonymousBanner({ tripCount, onLogin }: { tripCount: number; onLogin: () => void }) {
  return (
    <button
      onClick={onLogin}
      className="bg-white border border-border rounded-xl px-4 py-3 text-left flex items-center gap-3"
    >
      <div className="flex-1">
        <p className="text-[12px] font-semibold text-ink">Tes {tripCount} derniers trajets sur cet appareil</p>
        <p className="text-[11px] text-text-2 mt-0.5">Connecte-toi pour l&apos;historique complet et tes objectifs.</p>
      </div>
      <span className="text-[12px] font-semibold text-primary shrink-0">Se connecter</span>
    </button>
  );
}

function BucketChart({ buckets }: { buckets: CarbonSummaryDtoOut["buckets"] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.carbonGrams), 1);
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[13px] font-semibold text-ink mb-0.5">Ce que tes trajets ont émis</p>
      <p className="text-[11px] text-text-2 mb-3">Plus la barre est basse, moins tu as émis.</p>
      <div className="flex items-end gap-1.5 h-20">
        {buckets.map((bucket, index) => {
          const good = bucket.carbonGrams <= bucket.savedGrams;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-text-2">{formatCarbon(bucket.carbonGrams)}</span>
              <div
                className="w-full rounded-t-[3px] min-h-[4px]"
                style={{ height: `${(bucket.carbonGrams / max) * 60}px`, background: good ? "#16A34A" : "#B91C1C" }}
              />
              <span className="text-[9px] font-medium text-text-2">{bucket.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3.5 mt-2.5">
        <Legend className="bg-success" label="Performant" />
        <Legend className="bg-primary" label="À améliorer" />
      </div>
    </div>
  );
}

function ModeBreakdown({ byMode }: { byMode: CarbonSummaryDtoOut["byMode"] }) {
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[13px] font-semibold text-ink mb-0.5">D&apos;où viennent tes émissions</p>
      <p className="text-[11px] text-text-2 mb-3">Marche et vélo n&apos;émettent rien : ils restent à 0 %.</p>
      <div className="flex flex-col gap-2.5">
        {byMode.map((entry) => {
          const meta = MODE_META[entry.mode] ?? MODE_FALLBACK;
          const Icon = meta.icon;
          const percent = Math.round(entry.percent);
          return (
            <div key={entry.mode}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} style={{ color: meta.color }} />
                  <span className="text-[12px] text-ink">{meta.label}</span>
                </div>
                <span className="text-[12px] font-mono font-semibold" style={{ color: meta.color }}>
                  {percent}%
                </span>
              </div>
              <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: meta.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: NonNullable<CarbonSummaryDtoOut["goal"]> }) {
  const percent = Math.round(goal.percent);
  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex justify-between items-center mb-2.5">
        <p className="text-[13px] font-semibold text-ink">Objectif du mois</p>
        <div className="flex items-center gap-1">
          <Target size={12} className="text-primary" />
          <span className="text-[12px] font-semibold text-primary font-mono">{goal.targetKg} kg à économiser</span>
        </div>
      </div>
      <div className="h-2.5 bg-bg rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: "linear-gradient(90deg, #16A34A, #B91C1C)" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[11px] text-text-2 font-mono">
          {goal.achievedKg.toFixed(1).replace(".", ",")} kg économisés
        </span>
        <span className="text-[11px] font-semibold text-success">{percent}% atteint</span>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-[2px] inline-block ${className}`} />
      <span className="text-[10px] text-text-2">{label}</span>
    </div>
  );
}