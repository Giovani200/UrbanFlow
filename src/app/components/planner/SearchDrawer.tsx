"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUpDown, Search, Clock, ArrowRight, Bike, Bus, Footprints, Train } from "lucide-react";

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

export type GeocodingResult = {
  label: string;
  lat: number;
  lng: number;
};

interface Props {
  onSearch: (origin: GeocodingResult, destination: GeocodingResult) => void;
}

function useGeocoding(query: string) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (!key) return;

      try {
        const res = await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&bbox=5.65,45.1,5.78,45.25&language=fr&limit=5`
        );
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.features ?? []).map(
          (f: { place_name: string; center: [number, number] }) => ({
            label: f.place_name,
            lat: f.center[1],
            lng: f.center[0],
          })
        );
        setResults(items);
      } catch {
        /* geocoding fail silently */
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return results;
}

export function SearchDrawer({ onSearch }: Props) {
  const [when, setWhen]       = useState<WhenId>("now");
  const [fromText, setFromText]   = useState("Ma position actuelle");
  const [toText, setToText]       = useState("");
  const [fromGeo, setFromGeo]     = useState<GeocodingResult | null>(null);
  const [toGeo, setToGeo]         = useState<GeocodingResult | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [useGeoLocation, setUseGeoLocation] = useState(true);

  const fromResults = useGeocoding(activeField === "from" && !useGeoLocation ? fromText : "");
  const toResults   = useGeocoding(activeField === "to" ? toText : "");

  const currentResults = activeField === "from" ? fromResults : activeField === "to" ? toResults : [];

  function swapInputs() {
    setFromText(toText);
    setToText(fromText);
    setFromGeo(toGeo);
    setToGeo(fromGeo);
    setUseGeoLocation(false);
  }

  const selectResult = useCallback((result: GeocodingResult) => {
    if (activeField === "from") {
      setFromText(result.label);
      setFromGeo(result);
      setUseGeoLocation(false);
    } else {
      setToText(result.label);
      setToGeo(result);
    }
    setActiveField(null);
  }, [activeField]);

  function handleSearch() {
    if (useGeoLocation && !fromGeo) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin: GeocodingResult = {
            label: "Ma position",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          if (toGeo) onSearch(origin, toGeo);
        },
        () => { /* geolocation denied */ }
      );
      return;
    }

    if (fromGeo && toGeo) {
      onSearch(fromGeo, toGeo);
    }
  }

  const canSearch = toGeo && (fromGeo || useGeoLocation);

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
              onChange={(e) => { setFromText(e.target.value); setUseGeoLocation(false); }}
              onFocus={() => setActiveField("from")}
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
              value={toText}
              onChange={(e) => setToText(e.target.value)}
              onFocus={() => setActiveField("to")}
              placeholder="Où allez-vous ?"
              className="flex-1 text-sm text-uf-text-secondary bg-transparent outline-none"
            />
          </div>
        </div>

        {currentResults.length > 0 && (
          <div className="bg-white border border-uf-border rounded-xl overflow-hidden">
            {currentResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectResult(r)}
                className={`w-full text-left px-3.5 py-2.5 hover:bg-uf-bg transition-colors ${
                  i < currentResults.length - 1 ? "border-b border-uf-border" : ""
                }`}
              >
                <p className="text-sm text-uf-text truncate">{r.label}</p>
              </button>
            ))}
          </div>
        )}

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
          onClick={handleSearch}
          disabled={!canSearch}
          className={`w-full rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            canSearch
              ? "bg-uf-red text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Search size={16} />
          Rechercher
        </button>

        {!activeField && (
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
        )}
      </div>
    </div>
  );
}
