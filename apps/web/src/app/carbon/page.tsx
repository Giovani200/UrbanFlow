"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Bike, Bus, Footprints, Train, Target } from "lucide-react";

const PERIODS = [
  { id: "week",  label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "year",  label: "Année" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

const BARS = [
  { day: "L", val: 0.8, good: true  },
  { day: "M", val: 2.1, good: false },
  { day: "M", val: 0.4, good: true  },
  { day: "J", val: 1.9, good: false },
  { day: "V", val: 0.6, good: true  },
  { day: "S", val: 0.2, good: true  },
  { day: "D", val: 0.9, good: true  },
];

const MAX_VAL = Math.max(...BARS.map((b) => b.val));

const MODES = [
  { label: "Vélo",    icon: Bike,      val: 52, color: "#16A34A" },
  { label: "Tramway", icon: Train,     val: 28, color: "#3B82F6" },
  { label: "Bus",     icon: Bus,       val: 14, color: "#F59E0B" },
  { label: "Marche",  icon: Footprints, val: 6, color: "#6B7280" },
];

export default function CarbonPage() {
  const [period, setPeriod] = useState<PeriodId>("month");
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-uf-bg font-sans">
      {/* Header */}
      <div className="bg-white border-b border-uf-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-uf-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-uf-text" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-uf-text">Mon empreinte</h1>
        <Leaf size={18} className="text-uf-success" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        {/* Sélecteur période */}
        <div className="flex bg-white rounded-[10px] p-1 border border-uf-border">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 rounded-lg text-[13px] transition-colors ${
                period === p.id
                  ? "bg-uf-red text-white font-semibold"
                  : "text-uf-text-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chiffre principal */}
        <div className="bg-white rounded-xl px-5 py-5 text-center">
          <p className="text-[11px] font-semibold text-uf-text-secondary tracking-widest uppercase mb-2">
            CO₂ économisé ce mois
          </p>
          <p className="font-mono text-[54px] font-bold text-uf-text leading-none tracking-tight">18.4</p>
          <p className="text-[14px] text-uf-text-secondary mt-1 mb-3.5">kg CO₂eq</p>
          <div className="inline-flex items-center gap-1.5 bg-green-50 rounded-[10px] px-3.5 py-1.5">
            <Leaf size={14} className="text-uf-success" />
            <span className="text-[13px] font-semibold text-uf-success">−43% vs voiture solo</span>
          </div>
          <p className="text-[12px] text-uf-text-secondary mt-2.5">
            Équivalent à <span className="font-semibold text-uf-text">184 km</span> en voiture évités
          </p>
        </div>

        {/* Graphe en barres */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-[13px] font-semibold text-uf-text mb-3">Émissions par jour (kg CO₂)</p>
          <div className="flex items-end gap-1.5 h-20">
            {BARS.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-mono text-uf-text-secondary">{b.val}</span>
                <div
                  className="w-full rounded-t-[3px] min-h-[4px]"
                  style={{
                    height: `${(b.val / MAX_VAL) * 60}px`,
                    background: b.good ? "#16A34A" : "#B91C1C",
                  }}
                />
                <span className="text-[9px] font-medium text-uf-text-secondary">{b.day}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3.5 mt-2.5">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-[2px] bg-uf-success inline-block" />
              <span className="text-[10px] text-uf-text-secondary">Performant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-[2px] bg-uf-red inline-block" />
              <span className="text-[10px] text-uf-text-secondary">À améliorer</span>
            </div>
          </div>
        </div>

        {/* Répartition par mode */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-[13px] font-semibold text-uf-text mb-3">Répartition par mode</p>
          <div className="flex flex-col gap-2.5">
            {MODES.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <m.icon size={12} style={{ color: m.color }} />
                    <span className="text-[12px] text-uf-text">{m.label}</span>
                  </div>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: m.color }}>
                    {m.val}%
                  </span>
                </div>
                <div className="h-1.5 bg-uf-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.val}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objectif mensuel */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-[13px] font-semibold text-uf-text">Objectif mensuel</p>
            <div className="flex items-center gap-1">
              <Target size={12} className="text-uf-red" />
              <span className="text-[12px] font-semibold text-uf-red">25 kg CO₂</span>
            </div>
          </div>
          <div className="h-2.5 bg-uf-bg rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full"
              style={{ width: "74%", background: "linear-gradient(90deg, #16A34A, #B91C1C)" }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-uf-text-secondary">18.4 kg économisés</span>
            <span className="text-[11px] font-semibold text-uf-success">74% atteint</span>
          </div>
        </div>
      </div>
    </div>
  );
}
