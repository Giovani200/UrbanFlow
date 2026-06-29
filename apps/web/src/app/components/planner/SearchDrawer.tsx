"use client";

import { useState, useEffect } from "react";
import { ArrowUpDown, Search, Clock, ArrowRight, Bike, Bus, Footprints, Train, Navigation } from "lucide-react";
import { useGeocoding, reverseGeocode } from "@/app/hooks/useGeocoding";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import type { UserPosition } from "@/app/hooks/useGeolocation";

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
  onSearch: (origin: GeocodingResult, destination: GeocodingResult) => void;
  userPosition: UserPosition | null;
  onRequestPosition: () => void;
}

export function SearchDrawer({ onSearch, userPosition, onRequestPosition }: Props) {
  const [when, setWhen]               = useState<WhenId>("now");
  const [fromText, setFromText]       = useState("");
  const [toText, setToText]           = useState("");
  const [fromGeo, setFromGeo]         = useState<GeocodingResult | null>(null);
  const [toGeo, setToGeo]             = useState<GeocodingResult | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [awaitingPosition, setAwaitingPosition] = useState(false);

  const fromResults = useGeocoding(activeField === "from" ? fromText : "");
  const toResults   = useGeocoding(activeField === "to" ? toText : "");

  const currentResults = activeField === "from" ? fromResults : activeField === "to" ? toResults : [];
  const showSuggestions = activeField === "from" || currentResults.length > 0;
  const showRecents = !activeField;

  useEffect(() => {
    if (!awaitingPosition || !userPosition) return;
    setAwaitingPosition(false);
    void (async () => {
      const label =
          (await reverseGeocode(userPosition.latitude, userPosition.longitude)) ?? "Ma position actuelle";
      const origin: GeocodingResult = {
        label,
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      };
      setFromGeo(origin);
      setFromText(label);
      setActiveField(null);
    })();
  }, [awaitingPosition, userPosition]);

  function swapInputs() {
    setFromText(toText);
    setToText(fromText);
    setFromGeo(toGeo);
    setToGeo(fromGeo);
  }

  function selectResult(result: GeocodingResult) {
    if (activeField === "from") {
      setFromText(result.label);
      setFromGeo(result);
    } else {
      setToText(result.label);
      setToGeo(result);
    }
    setActiveField(null);
  }

  function handleSearch() {
    if (fromGeo && toGeo) {
      onSearch(fromGeo, toGeo);
    }
  }

  function handleUseMyPosition() {
    setAwaitingPosition(true);
    onRequestPosition();}

  const canSearch = !!(fromGeo && toGeo);

  return (
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col bg-white rounded-t-2xl shadow-2xl max-h-[75%]">
        <div className="flex justify-center py-3 shrink-0">
          <div className="w-9 h-1 rounded-full bg-uf-border" />
        </div>

        <div className="flex flex-col gap-3.5 px-4 pb-6 overflow-y-auto flex-1">
          <p className="text-[17px] font-bold text-uf-text">Planifier un trajet</p>

          <div className="bg-uf-bg rounded-xl">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-uf-success shrink-0" />
              <input
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  onFocus={() => setActiveField("from")}
                  placeholder="D'où partez-vous ?"
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
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  onFocus={() => setActiveField("to")}
                  placeholder="Où allez-vous ?"
                  className="flex-1 text-sm text-uf-text-secondary bg-transparent outline-none"
              />
            </div>
          </div>

          <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showSuggestions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="bg-white border border-uf-border rounded-xl overflow-hidden">
                {activeField === "from" && (
                    <button
                        onClick={handleUseMyPosition}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-uf-bg transition-colors ${
                            currentResults.length > 0 ? "border-b border-uf-border" : ""
                        }`}
                    >
                      <Navigation size={14} className="text-uf-red shrink-0" />
                      <span className="text-sm font-medium text-uf-text">Utiliser ma position actuelle</span>
                    </button>
                )}
                {currentResults.map((result, index) => (
                    <button
                        key={index}
                        onClick={() => selectResult(result)}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-uf-bg transition-colors ${
                            index < currentResults.length - 1 ? "border-b border-uf-border" : ""
                        }`}
                    >
                      <p className="text-sm text-uf-text truncate">{result.label}</p>
                    </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {WHEN_OPTIONS.map((option) => (
                <button
                    key={option.id}
                    onClick={() => setWhen(option.id)}
                    className={`flex-1 py-2 text-xs rounded-lg border-[1.5px] transition-colors ${
                        when === option.id
                            ? "border-uf-red bg-uf-red-light font-semibold text-uf-red"
                            : "border-uf-border bg-white text-uf-text-secondary"
                    }`}
                >
                  {option.label}
                </button>
            ))}
          </div>

          <button
              onClick={handleSearch}
              disabled={!canSearch}
              className={`w-full rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                  canSearch ? "bg-uf-red text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            <Search size={16} />
            Rechercher
          </button>
          <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showRecents ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="text-[11px] font-semibold text-uf-text-secondary tracking-widest uppercase mb-2.5">
                Trajets récents
              </p>
              <div className="flex flex-col">
                {RECENTS.map((recent, index) => (
                    <div
                        key={index}
                        className={`flex items-center gap-3 py-2.5 cursor-pointer ${
                            index < RECENTS.length - 1 ? "border-b border-uf-border" : ""
                        }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-uf-bg flex items-center justify-center shrink-0">
                        <Clock size={14} className="text-uf-text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-uf-text truncate">
                          {recent.from} <span className="text-uf-text-secondary">→</span>{" "}
                          <span className="font-medium">{recent.to}</span>
                        </p>
                        <div className="flex gap-1 mt-1">
                          {recent.modes.map((mode) => <span key={mode}>{MODE_ICONS[mode]}</span>)}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-uf-text-secondary shrink-0" />
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}