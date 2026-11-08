"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlannedTime } from "@urbanflow/app-front-back-lib";
import { Button } from "@/app/components/ui/Button";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { reverseGeocode, type GeocodingResult } from "@/app/hooks/useGeocoding";
import type { UserPosition } from "@/app/hooks/useGeolocation";
import { useRecentTrips, type RecentTrip } from "@/app/hooks/useRecentTrips";
import { PlaceFields, usePlacePair } from "./PlaceFields";

const WHEN_OPTIONS = [
  { id: "now", label: "Maintenant" },
  { id: "depart", label: "Partir à" },
  { id: "arrive", label: "Arriver avant" },
] as const;

type WhenId = (typeof WHEN_OPTIONS)[number]["id"];

const QUARTER_HOUR_MILLISECONDS = 15 * 60 * 1000;

/** Valeur d'un champ `datetime-local` (YYYY-MM-DDTHH:mm) en heure locale, sans passer par l'UTC. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function inAQuarterOfAnHour(): string {
  return toLocalInputValue(new Date(Date.now() + QUARTER_HOUR_MILLISECONDS));
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

  const pair = usePlacePair({ initialActiveField: "to" });
  const { places, activeField, choosePlace } = pair;
  const [when, setWhen] = useState<WhenId>("now");
  const [dateTimeValue, setDateTimeValue] = useState("");
  const [awaitingPosition, setAwaitingPosition] = useState(false);
  const resolvingPositionRef = useRef(false);

  const { trips: recentTrips } = useRecentTrips();

  useEffect(() => {
    if (!awaitingPosition || !userPosition || resolvingPositionRef.current) return;
    resolvingPositionRef.current = true;
    void reverseGeocode(userPosition.latitude, userPosition.longitude).then((label) => {
      choosePlace("from", { label: label ?? "Ma position", latitude: userPosition.latitude, longitude: userPosition.longitude });
      setAwaitingPosition(false);
      resolvingPositionRef.current = false;
    });
  }, [awaitingPosition, userPosition, choosePlace]);

  function chooseWhen(id: WhenId) {
    setWhen(id);
    if (id !== "now" && !dateTimeValue) setDateTimeValue(inAQuarterOfAnHour());
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

      <PlaceFields
        pair={pair}
        autoFocusField="to"
        positionOption={{
          label: awaitingPosition ? "Localisation…" : "Ma position",
          onChoose: () => {
            setAwaitingPosition(true);
            onRequestPosition();
          },
        }}
      />

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
