"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Bike, Bus, Footprints, Train, Leaf, Navigation } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";

const MODE_ICONS: Record<string, React.ElementType> = {
  walk: Footprints,
  tram: Train,
  bus:  Bus,
  bike: Bike,
};

const ROUTES = [
  { modes: ["bike", "tram"], duration: "22 min", dist: "4.2 km", co2: "12 gCO₂", badge: "Recommandé",   badgeGreen: false },
  { modes: ["bus",  "walk"], duration: "31 min", dist: "4.8 km", co2: "28 gCO₂", badge: null,            badgeGreen: false },
  { modes: ["walk"],         duration: "52 min", dist: "3.9 km", co2: "0 gCO₂",  badge: "Zéro carbone", badgeGreen: true  },
];

interface Props {
  onBack: () => void;
  onStart: () => void;
}

export function ResultsDrawer({ onBack, onStart }: Props) {
  const [selected, setSelected] = useState(0);
  const { dragY, dragging, onTouchStart, onTouchMove, onTouchEnd } =
    useBottomSheetDrag({ onDismiss: onBack });

  return (
    <>
      {/* Barre retour + résumé trajet */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="w-[42px] h-[42px] rounded-xl bg-white shadow-lg flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-uf-text" />
        </button>
        <div className="flex-1 bg-white rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-uf-success shrink-0" />
          <span className="text-[13px] text-uf-text-secondary">Domicile</span>
          <ArrowRight size={13} className="text-uf-text-secondary shrink-0" />
          <span className="text-[13px] font-semibold text-uf-text">Victor Hugo</span>
        </div>
      </div>

      {/* Drawer résultats */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 rounded-full bg-uf-border" />
        </div>

        <div className="px-4 pb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[15px] font-bold text-uf-text">{ROUTES.length} itinéraires trouvés</p>
            <span className="text-xs text-uf-text-secondary">À partir de 22 min</span>
          </div>

          <div className="flex flex-col gap-2">
            {ROUTES.map((r, i) => {
              const isSelected = selected === i;
              const ModeIcon = (m: string) => {
                const Icon = MODE_ICONS[m];
                return <Icon size={14} className={isSelected ? "text-uf-red" : "text-uf-text-secondary"} />;
              };

              return (
                <div
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                    isSelected ? "border-uf-red bg-uf-red-light" : "border-uf-border bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      {r.modes.map((m, j) => (
                        <span key={j} className="flex items-center gap-1.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-white" : "bg-uf-bg"}`}>
                            {ModeIcon(m)}
                          </span>
                          {j < r.modes.length - 1 && (
                            <ChevronRight size={10} className="text-uf-border" />
                          )}
                        </span>
                      ))}
                    </div>
                    {r.badge && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        r.badgeGreen ? "bg-green-50 text-uf-success" : "bg-uf-red text-white"
                      }`}>
                        {r.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[20px] font-bold text-uf-text">{r.duration}</span>
                      <span className="text-xs text-uf-text-secondary">{r.dist}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Leaf size={12} className={r.co2 === "0 gCO₂" ? "text-uf-success" : "text-uf-text-secondary"} />
                      <span className={`text-[11px] font-mono ${r.co2 === "0 gCO₂" ? "text-uf-success" : "text-uf-text-secondary"}`}>
                        {r.co2}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      onClick={onStart}
                      className="mt-2.5 w-full bg-uf-red text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Navigation size={15} />
                      Choisir cet itinéraire
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
