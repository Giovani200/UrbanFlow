"use client";

import { Bike, Bus, Footprints, Train, Check, Navigation, Square } from "lucide-react";

const MODE_ICONS: Record<string, React.ElementType> = {
  walk: Footprints,
  bike: Bike,
  tram: Train,
  bus:  Bus,
};

const STEPS = [
  { icon: "walk", label: "Marche",    instruction: "Prenez la rue Championnet vers le nord", dist: "320m",  done: true,  active: false },
  { icon: "bike", label: "Métrovélo", instruction: "Prenez le vélo jusqu'à Europole",         dist: "2.1 km", done: false, active: true  },
  { icon: "tram", label: "Tram A",    instruction: "Direction Crolles — 4 arrêts",             dist: "1.5 km", done: false, active: false },
  { icon: "walk", label: "Marche",    instruction: "Arrivée à destination",                   dist: "150m",  done: false, active: false },
];

const ACTIVE = STEPS.find((s) => s.active)!;

interface Props {
  onStop: () => void;
}

export function NavScreen({ onStop }: Props) {
  return (
    <>
      {/* Indicateur position courante sur la carte */}
      <div className="absolute top-[46%] left-[43%] z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="w-5 h-5 rounded-full bg-uf-red border-[3px] border-white shadow-[0_0_0_6px_rgba(185,28,28,0.2)]" />
      </div>

      {/* Bandeau instruction haut */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.18)] p-4">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-[14px] bg-uf-red-light flex items-center justify-center shrink-0">
              {(() => { const Icon = MODE_ICONS[ACTIVE.icon]; return <Icon size={26} className="text-uf-red" strokeWidth={1.75} />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-uf-red uppercase tracking-wider mb-0.5">{ACTIVE.label}</p>
              <p className="text-[16px] font-bold text-uf-text leading-tight">{ACTIVE.instruction}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[18px] font-bold text-uf-text">2.1</p>
              <p className="text-[11px] text-uf-text-secondary">km</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAB recentrer */}
      <button
        title="Recentrer"
        className="absolute right-4 bottom-[200px] z-10 w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center"
      >
        <Navigation size={18} className="text-uf-text" />
      </button>

      {/* Panneau bas */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] px-4 pt-4 pb-8">
        <div className="w-9 h-1 rounded-full bg-uf-border mx-auto mb-3.5" />

        {/* Étapes de progression — cercles centrés + lignes absolues */}
        <div className="relative flex items-center mb-1">
          {/* Ligne grise de base */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-uf-border"
            style={{ left: "12.5%", right: "12.5%" }}
          />
          {/* Segment vert pour les étapes terminées */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-uf-success"
            style={{ left: "12.5%", width: `${(STEPS.filter((s, i) => s.done && i < STEPS.length - 1).length / (STEPS.length - 1)) * 75}%` }}
          />
          {STEPS.map((s, i) => {
            const Icon = MODE_ICONS[s.icon];
            return (
              <div key={i} className="flex-1 flex justify-center relative z-10">
                <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${
                  s.done   ? "bg-uf-success" :
                  s.active ? "bg-uf-red" :
                             "bg-uf-bg"
                }`}>
                  {s.done
                    ? <Check size={14} className="text-white" strokeWidth={3} />
                    : <Icon size={14} className={s.active ? "text-white" : "text-uf-text-secondary"} />
                  }
                </div>
              </div>
            );
          })}
        </div>
        {/* Labels distances */}
        <div className="flex mb-3.5">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-1 text-center text-[9px] ${
              s.active ? "text-uf-red font-bold" : s.done ? "text-uf-success" : "text-uf-text-secondary"
            }`}>
              {s.dist}
            </div>
          ))}
        </div>

        {/* Résumé */}
        <div className="flex items-center bg-uf-bg rounded-[10px] px-3.5 py-3 mb-3">
          <div className="flex-1 text-center">
            <p className="font-mono text-[20px] font-bold text-uf-text">14 min</p>
            <p className="text-[11px] text-uf-text-secondary">restantes</p>
          </div>
          <div className="w-px h-8 bg-uf-border" />
          <div className="flex-1 text-center">
            <p className="font-mono text-[20px] font-bold text-uf-text">1.8 km</p>
            <p className="text-[11px] text-uf-text-secondary">restants</p>
          </div>
          <div className="w-px h-8 bg-uf-border" />
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <Train size={18} className="text-blue-500" />
            <p className="text-[10px] text-uf-text-secondary">prochain</p>
          </div>
        </div>

        {/* Stop */}
        <button
          onClick={onStop}
          className="w-full border border-uf-border rounded-lg py-2.5 text-[13px] font-medium text-uf-text-secondary flex items-center justify-center gap-1.5"
        >
          <Square size={14} className="text-uf-text-secondary" />
          Arrêter la navigation
        </button>
      </div>
    </>
  );
}
