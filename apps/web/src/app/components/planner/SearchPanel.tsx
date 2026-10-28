"use client";

import { ArrowUpDown, Clock3, LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlannedTime } from "@urbanflow/app-front-back-lib";
import { Button } from "@/app/components/ui/Button";
import { StopNode } from "@/app/components/ui/StopNode";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { reverseGeocode, useGeocoding, type GeocodingResult } from "@/app/hooks/useGeocoding";
import type { UserPosition } from "@/app/hooks/useGeolocation";
import { useRecentTrips, type RecentTrip } from "@/app/hooks/useRecentTrips";

const WHEN_OPTIONS = [
  { id: "now", label: "Maintenant" },
  { id: "depart", label: "Partir à" },
  { id: "arrive", label: "Arriver avant" },
] as const;

type WhenId = (typeof WHEN_OPTIONS)[number]["id"];
type Field = "from" | "to";

const QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1000;

/** Valeur d'un champ `datetime-local` (YYYY-MM-DDTHH:mm) en heure locale, sans passer par l'UTC. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface SearchPanelProps {
  userPosition: UserPosition | null;
  onSearch: (origin: GeocodingResult, destination: GeocodingResult, plannedTime?: PlannedTime) => void;
  onRequestPosition: () => void;
  onBack: () => void;
}

/** Recherche d'un trajet : départ, destination, moment du départ ou de l'arrivée, trajets récents. */
export function SearchPanel({ userPosition, onSearch, onRequestPosition, onBack }: SearchPanelProps) {
  useEscapeKey(onBack);

  const [texts, setTexts] = useState<Record<Field, string>>({ from: "", to: "" });
  const [places, setPlaces] = useState<Record<Field, GeocodingResult | null>>({ from: null, to: null });
  const [activeField, setActiveField] = useState<Field | null>("to");
  const [when, setWhen] = useState<WhenId>("now");
  const [dateTimeValue, setDateTimeValue] = useState("");
  const [awaitingPosition, setAwaitingPosition] = useState(false);
  const resolvingPositionRef = useRef(false);

  const suggestions = useGeocoding(activeField ? texts[activeField] : "");
  const { trips: recentTrips } = useRecentTrips();

  useEffect(() => {
    if (!awaitingPosition || !userPosition || resolvingPositionRef.current) return;
    resolvingPositionRef.current = true;
    void reverseGeocode(userPosition.latitude, userPosition.longitude).then((label) => {
      choosePlace("from", { label: label ?? "Ma position", latitude: userPosition.latitude, longitude: userPosition.longitude });
      setAwaitingPosition(false);
      resolvingPositionRef.current = false;
    });
  }, [awaitingPosition, userPosition]);

  function choosePlace(field: Field, place: GeocodingResult) {
    setTexts((current) => ({ ...current, [field]: place.label }));
    setPlaces((current) => ({ ...current, [field]: place }));
    setActiveField(null);
  }

  function editText(field: Field, value: string) {
    setTexts((current) => ({ ...current, [field]: value }));
    setPlaces((current) => ({ ...current, [field]: null }));
  }

  function swap() {
    setTexts(({ from, to }) => ({ from: to, to: from }));
    setPlaces(({ from, to }) => ({ from: to, to: from }));
  }

  function chooseWhen(id: WhenId) {
    setWhen(id);
    if (id !== "now" && !dateTimeValue) setDateTimeValue(toLocalInputValue(new Date(Date.now() + QUARTER_HOUR_MILLISECONDS)));
  }

  function submit() {
    if (!places.from || !places.to) return;
    const plannedTime: PlannedTime | undefined =
      when === "now" ? undefined : { dateTime: dateTimeValue, mode: when === "arrive" ? "arrival" : "departure" };
    onSearch(places.from, places.to, plannedTime);
  }

  function replay(trip: RecentTrip) {
    if (!trip.origin || !trip.destination) return;
    onSearch({ label: trip.originLabel, ...trip.origin }, { label: trip.destinationLabel, ...trip.destination });
  }

  const canSearch = Boolean(places.from && places.to) && (when === "now" || dateTimeValue !== "");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="[font:var(--uf-title)] tracking-[var(--uf-title-tracking)]">Où vas-tu ?</h2>

      <div className="uf-inset relative flex flex-col rounded-uf-inset">
        {(["from", "to"] as const).map((field) => (
          <label key={field} className="flex min-h-14 cursor-text items-center gap-3 px-4">
            <StopNode kind={field === "from" ? "origin" : "destination"} />
            <span className="flex min-w-0 flex-1 flex-col py-2">
              <span className="[font:var(--uf-note)] font-bold">{field === "from" ? "Départ" : "Arrivée"}</span>
              <input
                value={texts[field]}
                onChange={(event) => editText(field, event.target.value)}
                onFocus={() => setActiveField(field)}
                placeholder="Une adresse, un arrêt"
                autoFocus={field === "to"}
                className="min-w-0 border-0 bg-transparent p-0 [font:var(--uf-body)] text-uf-ink outline-none placeholder:text-uf-ink-2"
              />
            </span>
          </label>
        ))}
        <button
          type="button"
          onClick={swap}
          aria-label="Inverser le départ et l'arrivée"
          className="uf-glass absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <ArrowUpDown size={18} aria-hidden="true" />
        </button>
      </div>

      {activeField && (
        <ul aria-label="Suggestions" className="flex flex-col gap-1">
          {activeField === "from" && (
            <li>
              <button
                type="button"
                onClick={() => {
                  setAwaitingPosition(true);
                  onRequestPosition();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-uf-inset px-3 text-left [font:var(--uf-body)] font-bold"
              >
                <LocateFixed size={18} aria-hidden="true" />
                {awaitingPosition ? "Localisation…" : "Ma position"}
              </button>
            </li>
          )}
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.latitude},${suggestion.longitude}`}>
              <button
                type="button"
                onClick={() => choosePlace(activeField, suggestion)}
                className="flex min-h-11 w-full flex-col justify-center rounded-uf-inset px-3 py-1.5 text-left"
              >
                <span className="truncate [font:var(--uf-body)] font-bold">{suggestion.name}</span>
                {suggestion.detail && <span className="truncate [font:var(--uf-note)] text-uf-ink-2">{suggestion.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Quand</legend>
        <div className="flex gap-2">
          {WHEN_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={when === option.id}
              onClick={() => chooseWhen(option.id)}
              className={`h-11 flex-1 rounded-full text-[14px] font-bold ${when === option.id ? "bg-uf-ink text-uf-on-ink" : "uf-inset text-uf-ink"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {when !== "now" && (
          <label className="uf-inset flex min-h-14 items-center justify-between gap-3 rounded-uf-inset px-4">
            <span className="[font:var(--uf-note)] font-bold">{when === "arrive" ? "Arriver avant" : "Partir à"}</span>
            <input
              type="datetime-local"
              value={dateTimeValue}
              min={toLocalInputValue(new Date())}
              onChange={(event) => setDateTimeValue(event.target.value)}
              className="border-0 bg-transparent [font:var(--uf-body)] tabular-nums text-uf-ink"
            />
          </label>
        )}
      </fieldset>

      <Button variant="primary" onClick={submit} disabled={!canSearch}>
        Voir les trajets
      </Button>

      {!activeField && recentTrips.length > 0 && (
        <section aria-labelledby="trajets-recents" className="flex flex-col gap-2">
          <h3 id="trajets-recents" className="[font:var(--uf-note)] font-bold text-uf-ink-2">
            Trajets récents
          </h3>
          {recentTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => replay(trip)}
              disabled={!trip.origin || !trip.destination}
              className="uf-inset flex min-h-14 items-center gap-3 rounded-uf-inset px-4 text-left disabled:cursor-default"
            >
              <Clock3 size={18} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate [font:var(--uf-body)]">
                {trip.originLabel} <span className="sr-only">vers</span>
                <span aria-hidden="true"> › </span>
                <strong>{trip.destinationLabel}</strong>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
