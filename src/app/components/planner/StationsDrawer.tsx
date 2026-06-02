"use client";

import { useRef, useState } from "react";
import { Bike, ChevronRight, Navigation } from "lucide-react";

const STATIONS = [
  { name: "Station Victor Hugo", dist: "180m", bikes: 7, docks: 3 },
  { name: "Station Berriat",     dist: "340m", bikes: 2, docks: 8 },
  { name: "Station Europole",    dist: "520m", bikes: 5, docks: 2 },
];

// Offset en px pour la position réduite (montre uniquement le handle + titre)
const COLLAPSED_Y = 210;

function BikeAvailability({ count }: { count: number }) {
  if (count > 3) return <span className="text-green-600 font-semibold">{count} vélos</span>;
  if (count > 0) return <span className="text-amber-600 font-semibold">{count} vélos</span>;
  return <span className="text-red-600 font-semibold">0 vélo</span>;
}

interface Props {
  onPlanTrip: () => void;
}

export function StationsDrawer({ onPlanTrip }: Props) {
  const [snap, setSnap]       = useState<"up" | "down">("up");
  const [dragY, setDragY]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY           = useRef(0);

  const baseOffset = snap === "down" ? COLLAPSED_Y : 0;

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current;
    // Clamp : ne pas dépasser le haut ni sortir trop bas
    const total = baseOffset + delta;
    setDragY(Math.max(-baseOffset, Math.min(delta, COLLAPSED_Y - baseOffset + 40)));
  }

  function onTouchEnd() {
    setDragging(false);
    const total = baseOffset + dragY;
    setSnap(total > COLLAPSED_Y / 2 ? "down" : "up");
    setDragY(0);
  }

  const translateY = Math.max(0, baseOffset + dragY);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl pb-7"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: dragging ? "none" : "transform 300ms cubic-bezier(0.32,0.72,0,1)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
        <div className="w-9 h-1 rounded-full bg-uf-border" />
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-3.5">
          <div>
            <p className="text-sm font-bold text-uf-text">Stations Metrovelo proches</p>
            <p className="text-xs text-uf-text-secondary mt-0.5">Mis a jour il y a 30s</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-semibold">En direct</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-3.5">
          {STATIONS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-uf-bg rounded-xl">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bikes > 0 ? "bg-uf-red-light" : "bg-gray-100"}`}>
                <Bike size={18} className={s.bikes > 0 ? "text-uf-red" : "text-uf-text-secondary"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-uf-text truncate">{s.name}</p>
                <p className="text-xs text-uf-text-secondary mt-0.5">
                  {s.dist} · <BikeAvailability count={s.bikes} /> · {s.docks} places
                </p>
              </div>
              <ChevronRight size={14} className="text-uf-text-secondary shrink-0" />
            </div>
          ))}
        </div>

        <button
          onClick={onPlanTrip}
          className="w-full bg-uf-red text-white rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Navigation size={16} />
          Planifier un trajet
        </button>
      </div>
    </div>
  );
}
