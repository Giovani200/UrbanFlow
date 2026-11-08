"use client";

import { ArrowUpDown, LocateFixed } from "lucide-react";
import { useCallback, useState } from "react";
import { StopNode } from "@/app/components/ui/StopNode";
import { useGeocoding, type GeocodingResult } from "@/app/hooks/useGeocoding";

export type PlaceField = "from" | "to";

const FIELDS: PlaceField[] = ["from", "to"];

interface PlacePairOptions {
  initialPlaces?: Record<PlaceField, GeocodingResult | null>;
  initialActiveField?: PlaceField | null;
}

/** L'état d'un couple départ/arrivée. Chaque écran garde le sien : la recherche et les routines ne partagent rien. */
export function usePlacePair({ initialPlaces, initialActiveField = null }: PlacePairOptions = {}) {
  const [places, setPlaces] = useState<Record<PlaceField, GeocodingResult | null>>(initialPlaces ?? { from: null, to: null });
  const [texts, setTexts] = useState<Record<PlaceField, string>>({
    from: initialPlaces?.from?.label ?? "",
    to: initialPlaces?.to?.label ?? "",
  });
  const [activeField, setActiveField] = useState<PlaceField | null>(initialActiveField);

  const choosePlace = useCallback((field: PlaceField, place: GeocodingResult) => {
    setTexts((current) => ({ ...current, [field]: place.label }));
    setPlaces((current) => ({ ...current, [field]: place }));
    setActiveField(null);
  }, []);

  function editText(field: PlaceField, value: string) {
    setTexts((current) => ({ ...current, [field]: value }));
    setPlaces((current) => ({ ...current, [field]: null }));
  }

  function swap() {
    setTexts(({ from, to }) => ({ from: to, to: from }));
    setPlaces(({ from, to }) => ({ from: to, to: from }));
  }

  return { places, texts, activeField, setActiveField, choosePlace, editText, swap };
}

export type PlacePair = ReturnType<typeof usePlacePair>;

interface PlaceFieldsProps {
  pair: PlacePair;
  autoFocusField?: PlaceField;
  /** Propose « Ma position » sur le champ de départ. */
  positionOption?: { label: string; onChoose: () => void };
}

/** Les champs départ et arrivée, avec leurs suggestions d'adresses. */
export function PlaceFields({ pair, autoFocusField, positionOption }: PlaceFieldsProps) {
  const { texts, activeField, setActiveField, choosePlace, editText, swap } = pair;
  const suggestions = useGeocoding(activeField ? texts[activeField] : "");

  return (
    <>
      <div className="uf-inset relative flex flex-col rounded-uf-inset">
        {FIELDS.map((field) => (
          <label key={field} className="flex min-h-14 cursor-text items-center gap-3 px-4">
            <StopNode kind={field === "from" ? "origin" : "destination"} />
            <span className="flex min-w-0 flex-1 flex-col py-2">
              <span className="[font:var(--uf-note)] font-bold">{field === "from" ? "Départ" : "Arrivée"}</span>
              <input
                value={texts[field]}
                onChange={(event) => editText(field, event.target.value)}
                onFocus={() => setActiveField(field)}
                placeholder="Une adresse, un arrêt"
                autoFocus={field === autoFocusField}
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
          {activeField === "from" && positionOption && (
            <li>
              <button
                type="button"
                onClick={positionOption.onChoose}
                className="flex min-h-11 w-full items-center gap-3 rounded-uf-inset px-3 text-left [font:var(--uf-body)] font-bold"
              >
                <LocateFixed size={18} aria-hidden="true" />
                {positionOption.label}
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
    </>
  );
}
