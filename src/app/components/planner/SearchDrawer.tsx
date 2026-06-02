"use client";

import { useState, useEffect } from "react";
import { ArrowUpDown, Search, Clock, ArrowRight, Bike, Bus, Footprints, Train } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";

const MODE_ICONS: Record<string, React.ReactNode> = {
  walk: <Footprints size={12} className="text-uf-text-secondary" />,
  tram: <Train size={12} className="text-uf-text-secondary" />,
  bus:  <Bus size={12} className="text-uf-text-secondary" />,
  bike: <Bike size={12} className="text-uf-text-secondary" />,
};

const RECENTS = [
  { from: "Domicile",  to: "Place Victor Hugo", modes: ["walk", "tram"] },
  { from: "Gare SNCF", to: "Campus UPMF",       modes: ["bike"] },
  { from: "Berriat",   to: "Hôpital Michallon",  modes: ["bus", "walk"] },
];

const WHEN_OPTIONS = [
  { id: "now",    label: "Maintenant" },
  { id: "depart", label: "Départ à" },
  { id: "arrive", label: "Arrivée avant" },
] as const;

type WhenId = (typeof WHEN_OPTIONS)[number]["id"];

interface Props {
  onClose: () => void;
  onSearch: () => void;
}

export function SearchDrawer({ onClose, onSearch }: Props) {
  const [visible, setVisible] = useState(false);
  const [when, setWhen]       = useState<WhenId>("now");
  const [from, setFrom]       = useState("Ma position actuelle");
  const [to, setTo]           = useState("");

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  const { dragY, dragging, onTouchStart, onTouchMove, onTouchEnd } =
    useBottomSheetDrag({ onDismiss: dismiss });

  // Double rAF : garantit que le translateY(100%) initial est peint avant la transition
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  function swapInputs() {
    setFrom(to);
    setTo(from);
  }

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismiss}
      />

      <div
        className="absolute bottom-0 left-0 right-0 z-20 h-[74%] flex flex-col bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: visible ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center py-3 shrink-0">
          <div className="w-9 h-1 rounded-full bg-uf-border" />
        </div>

        <div className="flex flex-col gap-3.5 px-4 pb-6 overflow-y-auto flex-1">
          <p className="text-[17px] font-bold text-uf-text">Planifier un trajet</p>

          <div className="bg-uf-bg rounded-xl">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-uf-success shrink-0" />
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Ma position actuelle"
                className="flex-1 text-sm font-medium text-uf-text bg-transparent outline-none"
              />
            </div>

            <div className="flex items-center">
              <div className="flex-1 h-px bg-uf-border ml-[34px]" />
              <button
                onClick={swapInputs}
                className="w-7 h-7 rounded-lg bg-white border border-uf-border flex items-center justify-center mx-3 shrink-0"
              >
                <ArrowUpDown size={13} className="text-uf-text-secondary" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-uf-red shrink-0" />
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Où allez-vous ?"
                className="flex-1 text-sm text-uf-text-secondary bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {WHEN_OPTIONS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWhen(w.id)}
                className={`flex-1 py-2 text-xs rounded-lg border-[1.5px] transition-colors ${
                  when === w.id
                    ? "border-uf-red bg-uf-red-light font-semibold text-uf-red"
                    : "border-uf-border bg-white text-uf-text-secondary"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <button
            onClick={onSearch}
            className="w-full bg-uf-red text-white rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Search size={16} />
            Rechercher
          </button>

          <div>
            <p className="text-[11px] font-semibold text-uf-text-secondary tracking-widest uppercase mb-2.5">
              Trajets récents
            </p>
            <div className="flex flex-col">
              {RECENTS.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-2.5 cursor-pointer ${
                    i < RECENTS.length - 1 ? "border-b border-uf-border" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-uf-bg flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-uf-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-uf-text truncate">
                      {r.from} <span className="text-uf-text-secondary">→</span>{" "}
                      <span className="font-medium">{r.to}</span>
                    </p>
                    <div className="flex gap-1 mt-1">
                      {r.modes.map((m) => MODE_ICONS[m])}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-uf-text-secondary shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
