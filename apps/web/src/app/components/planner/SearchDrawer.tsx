"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpDown, Search, Clock, ArrowRight, Navigation } from "lucide-react";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { useFocusOnMount } from "@/app/hooks/useFocusOnMount";
import { useGeocoding, reverseGeocode } from "@/app/hooks/useGeocoding";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import type { UserPosition } from "@/app/hooks/useGeolocation";
import type { PlannedTime } from "@urbanflow/app-front-back-lib";
import { useRecentTrips, type RecentTrip } from "@/app/hooks/useRecentTrips";
import { MODE_META, MODE_FALLBACK } from "@/app/lib/mode-meta";

const WHEN_OPTIONS = [
  { id: "now",    label: "Maintenant" },
  { id: "depart", label: "Départ à" },
  { id: "arrive", label: "Arrivée avant" },
] as const;

type WhenId = (typeof WHEN_OPTIONS)[number]["id"];

/** Formate une date en valeur d'input `datetime-local` (YYYY-MM-DDTHH:mm) en heure locale, sans passer par l'UTC. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Props {
  onSearch: (origin: GeocodingResult, destination: GeocodingResult, plannedTime?: PlannedTime) => void;
  userPosition: UserPosition | null;
  onRequestPosition: () => void;
  onBack: () => void;
}

export function SearchDrawer({ onSearch, userPosition, onRequestPosition, onBack }: Props) {
  const panelRef = useFocusOnMount<HTMLDivElement>();
  useEscapeKey(onBack);

  const [when, setWhen]               = useState<WhenId>("now");
  const [dateTimeValue, setDateTimeValue] = useState("");
  const [fromText, setFromText]       = useState("");
  const [toText, setToText]           = useState("");
  const [fromGeo, setFromGeo]         = useState<GeocodingResult | null>(null);
  const [toGeo, setToGeo]             = useState<GeocodingResult | null>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [awaitingPosition, setAwaitingPosition] = useState(false);

  const fromResults = useGeocoding(activeField === "from" ? fromText : "");
  const toResults   = useGeocoding(activeField === "to" ? toText : "");

  const { trips: recentTrips } = useRecentTrips();

  const currentResults = activeField === "from" ? fromResults : activeField === "to" ? toResults : [];
  const showSuggestions = activeField === "from" || currentResults.length > 0;
  const showRecents = !activeField && recentTrips.length > 0;

  // Une référence garde le verrou sans déclencher de rendu : la position peut
  // changer pendant le géocodage inverse, on ne le relance pas pour autant.
  const resolvingPositionRef = useRef(false);

  useEffect(() => {
    if (!awaitingPosition || !userPosition || resolvingPositionRef.current) return;
    resolvingPositionRef.current = true;

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
      setAwaitingPosition(false);
      resolvingPositionRef.current = false;
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
    if (!fromGeo || !toGeo) return;
    if (when === "now") {
      onSearch(fromGeo, toGeo);
    } else {
      onSearch(fromGeo, toGeo, { dateTime: dateTimeValue, mode: when === "arrive" ? "arrival" : "departure" });
    }
  }

  function handleRecentTrip(trip: RecentTrip) {
    if (!trip.origin || !trip.destination) return;
    onSearch(
      { label: trip.originLabel, ...trip.origin },
      { label: trip.destinationLabel, ...trip.destination },
    );
  }

  function handleUseMyPosition() {
    setAwaitingPosition(true);
    onRequestPosition();}

  const canSearch = !!(fromGeo && toGeo) && (when === "now" || dateTimeValue !== "");

  return (
      <div
          ref={panelRef}
          role="region"
          aria-label="Planifier un trajet"
          tabIndex={-1}
          className="absolute bottom-0 left-0 right-0 z-20 flex flex-col bg-white rounded-t-2xl shadow-2xl max-h-[75%]"
      >
        <div className="flex justify-center py-3 shrink-0">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="flex flex-col gap-3.5 px-4 pb-6 overflow-y-auto flex-1">
          <p className="text-[17px] font-bold text-ink">Planifier un trajet</p>

          <div className="bg-bg rounded-xl">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-eco shrink-0" />
              <input
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  onFocus={() => setActiveField("from")}
                  placeholder="D'où partez-vous ?"
                  aria-label="Point de départ"
                  className="flex-1 text-sm font-medium text-ink bg-transparent"
              />
            </div>

            <div className="flex items-center">
              <div className="flex-1 h-px bg-border ml-[34px]" />
              <button
                  onClick={swapInputs}
                  aria-label="Inverser le départ et la destination"
                  className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center mx-3 shrink-0"
              >
                <ArrowUpDown size={13} className="text-text-2" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
              <input
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  onFocus={() => setActiveField("to")}
                  placeholder="Où allez-vous ?"
                  aria-label="Destination"
                  className="flex-1 text-sm text-text-2 bg-transparent"
              />
            </div>
          </div>

          <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showSuggestions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                {activeField === "from" && (
                    <button
                        onClick={handleUseMyPosition}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-bg transition-colors ${
                            currentResults.length > 0 ? "border-b border-border" : ""
                        }`}
                    >
                      <Navigation size={14} className="text-primary shrink-0" />
                      <span className="text-sm font-medium text-ink">Utiliser ma position actuelle</span>
                    </button>
                )}
                {currentResults.map((result, index) => (
                    <button
                        key={index}
                        onClick={() => selectResult(result)}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-bg transition-colors ${
                            index < currentResults.length - 1 ? "border-b border-border" : ""
                        }`}
                    >
                      <p className="text-sm text-ink truncate">{result.label}</p>
                    </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {WHEN_OPTIONS.map((option) => (
                <button
                    key={option.id}
                    onClick={() => {
                      setWhen(option.id);
                      if (option.id !== "now" && !dateTimeValue) {
                        setDateTimeValue(toLocalInputValue(new Date(Date.now() + 15 * 60 * 1000)));
                      }
                    }}
                    className={`flex-1 py-2 text-xs rounded-lg border-[1.5px] transition-colors ${
                        when === option.id
                            ? "border-primary bg-primary-tint font-semibold text-primary"
                            : "border-border bg-white text-text-2"
                    }`}
                >
                  {option.label}
                </button>
            ))}
          </div>

          {when !== "now" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="planned-time" className="text-[11px] font-semibold text-text-2">
                {when === "arrive" ? "Arriver avant" : "Partir à"}
              </label>
              <input
                id="planned-time"
                type="datetime-local"
                value={dateTimeValue}
                min={toLocalInputValue(new Date())}
                onChange={(event) => setDateTimeValue(event.target.value)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink"
              />
            </div>
          )}

          <button
              onClick={handleSearch}
              disabled={!canSearch}
              className={`w-full rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                  canSearch ? "bg-primary text-white" : "bg-[#ECEAE4] text-[#A7A39A] cursor-not-allowed"
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
              <p className="text-[11px] font-semibold text-text-2 mb-2.5">
                Trajets récents
              </p>
              <div className="flex flex-col">
                {recentTrips.map((trip, index) => (
                    <button
                        key={trip.id}
                        type="button"
                        onClick={() => handleRecentTrip(trip)}
                        disabled={!trip.origin || !trip.destination}
                        aria-label={`Relancer le trajet ${trip.originLabel} vers ${trip.destinationLabel}`}
                        className={`w-full text-left flex items-center gap-3 py-2.5 disabled:cursor-default ${
                            index < recentTrips.length - 1 ? "border-b border-border" : ""
                        }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center shrink-0">
                        <Clock size={14} className="text-text-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink truncate">
                          {trip.originLabel} <span className="text-text-2">→</span>{" "}
                          <span className="font-medium">{trip.destinationLabel}</span>
                        </p>
                        <div className="flex gap-1 mt-1">
                          {trip.modes.map((mode) => {
                            const ModeIcon = (MODE_META[mode] ?? MODE_FALLBACK).icon;
                            return <ModeIcon key={mode} size={12} className="text-text-2" />;
                          })}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-text-2 shrink-0" />
                    </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}