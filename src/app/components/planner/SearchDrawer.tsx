"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpDown, Search, Clock, ArrowRight, Bike, Bus, Footprints, Train, Navigation } from "lucide-react";

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
  onLocateMe?: (position: GeocodingResult) => void;
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
          `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&bbox=1.45,48.12,3.56,49.25&language=fr&limit=5`
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

export function SearchDrawer({ onSearch, onLocateMe }: Props) {
  const [when, setWhen]       = useState<WhenId>("now");
  const [fromText, setFromText]   = useState("");
  const [toText, setToText]       = useState("");
  const [fromGeo, setFromGeo]     = useState<GeocodingResult | null>(null);
  const [toGeo, setToGeo]         = useState<GeocodingResult | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [useGeoLocation, setUseGeoLocation] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  const fromResults = useGeocoding(activeField === "from" && !useGeoLocation ? fromText : "");
  const toResults   = useGeocoding(activeField === "to" ? toText : "");

  const currentResults = activeField === "from" ? fromResults : activeField === "to" ? toResults : [];
  const showSuggestions = activeField === "from" || currentResults.length > 0;
  const showRecents = !activeField;

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
    if (fromGeo && toGeo) {
      onSearch(fromGeo, toGeo);
    }
  }

  function selectCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = "Ma position actuelle";

        const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
        if (key) {
          try {
            const res = await fetch(
              `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&language=fr&limit=1`
            );
            if (res.ok) {
              const data = await res.json();
              const placeName = data.features?.[0]?.place_name;
              if (placeName) label = placeName;
            }
          } catch {
            /* reverse geocoding fail silently, keep default label */
          }
        }

        setFromGeo({ label, lat, lng });
        setFromText(label);
        setUseGeoLocation(true);
        setActiveField(null);
        onLocateMe?.({ label, lat, lng });
      },
      () => setShowLocationDialog(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

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

        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showSuggestions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="bg-white border border-uf-border rounded-xl overflow-hidden">
              {activeField === "from" && (
                <button
                  onClick={selectCurrentLocation}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-uf-bg transition-colors ${
                    currentResults.length > 0 ? "border-b border-uf-border" : ""
                  }`}
                >
                  <Navigation size={14} className="text-uf-red shrink-0" />
                  <span className="text-sm font-medium text-uf-text">Utiliser ma position actuelle</span>
                </button>
              )}
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
                      {r.modes.map((m) => <span key={m}>{MODE_ICONS[m]}</span>)}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-uf-text-secondary shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
            <Dialog.Title className="text-base font-bold text-uf-text mb-1.5">
              Localisation désactivée
            </Dialog.Title>
            <Dialog.Description className="text-sm text-uf-text-secondary mb-4">
              Activez la géolocalisation dans les paramètres de votre navigateur pour utiliser votre position actuelle comme point de départ.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button className="w-full rounded-lg py-2.5 font-semibold text-sm bg-uf-red text-white">
                Compris
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
