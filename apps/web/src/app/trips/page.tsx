"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, Bike, Bus, Footprints, Train } from "lucide-react";

const MODE_ICONS: Record<string, React.ElementType> = {
  bike: Bike,
  bus:  Bus,
  walk: Footprints,
  tram: Train,
};

const FILTERS = [
  { id: "week",  label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all",   label: "Tout" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const TRIPS = [
  { from: "Domicile",       to: "Victor Hugo",      date: "Auj. 08:42",  mode: "bike", duration: "18 min", co2: "0 gCO₂",  co2Good: true  },
  { from: "Victor Hugo",    to: "Campus UPMF",      date: "Auj. 12:15",  mode: "tram", duration: "12 min", co2: "14 gCO₂", co2Good: false },
  { from: "Gare Grenoble",  to: "Berriat",          date: "Hier 18:30",  mode: "walk", duration: "22 min", co2: "0 gCO₂",  co2Good: true  },
  { from: "Berriat",        to: "Hôpital Michallon", date: "Hier 09:05", mode: "bus",  duration: "25 min", co2: "32 gCO₂", co2Good: false },
  { from: "Europole",       to: "Domicile",         date: "02/05 17:45", mode: "bike", duration: "20 min", co2: "0 gCO₂",  co2Good: true  },
  { from: "Campus UPMF",    to: "Centre-Ville",     date: "01/05 11:00", mode: "tram", duration: "15 min", co2: "18 gCO₂", co2Good: false },
];

export default function TripsPage() {
  const [filter, setFilter] = useState<FilterId>("month");
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-bg font-sans">
      {/* Header */}
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">Mes trajets</h1>
        <History size={18} className="text-text-2" />
      </div>

      {/* Filtres */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex gap-2 shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-2xl border-[1.5px] text-[12px] transition-colors ${
              filter === f.id
                ? "border-primary bg-primary-tint font-semibold text-primary"
                : "border-border bg-white text-text-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Résumé */}
      <div className="bg-white border-b border-border flex shrink-0">
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-ink">47</p>
          <p className="text-[10px] text-text-2">trajets</p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-success">18.4</p>
          <p className="text-[10px] text-text-2">kg CO₂ évités</p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-ink">8h</p>
          <p className="text-[10px] text-text-2">en déplacement</p>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8 flex flex-col gap-2">
        {TRIPS.map((t, i) => {
          const Icon = MODE_ICONS[t.mode];
          return (
            <div key={i} className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-tint flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">
                  {t.from} <span className="text-text-2">→</span> {t.to}
                </p>
                <p className="text-[11px] text-text-2 mt-0.5">{t.date} · {t.duration}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-mono text-[12px] font-bold ${t.co2Good ? "text-success" : "text-primary"}`}>
                  {t.co2}
                </p>
                <p className="text-[10px] text-text-2 mt-0.5">émissions</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
