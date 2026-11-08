"use client";

import { useState } from "react";
import type { LabeledCoordinates, RoutineFields } from "@urbanflow/app-front-back-lib";
import { PlaceFields, usePlacePair } from "@/app/components/planner/PlaceFields";
import { RouteCard } from "@/app/components/planner/RouteCard";
import { Button } from "@/app/components/ui/Button";
import { ChoiceChip } from "@/app/components/ui/ChoiceChip";
import { FormField } from "@/app/components/ui/FormField";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { useRoutingProfile } from "@/app/hooks/useRoutingProfile";
import { nextArrivalDateTime, ROUTINE_WEEKDAYS, toRoutineFields } from "@/app/lib/routine-form";
import { transitMessage } from "@/app/lib/trip-results";
import type { RoutineDtoOut } from "@/app/services/routines.service";
import { tripsService, type TripRoute } from "@/app/services/trips.service";

const WEEKDAYS_MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
const DEFAULT_ARRIVAL_TIME = "09:00";

function toCoordinates(place: LabeledCoordinates): LabeledCoordinates {
  return { label: place.label, latitude: place.latitude, longitude: place.longitude };
}

function isSamePlace(first: LabeledCoordinates | null, second: LabeledCoordinates): boolean {
  return first?.latitude === second.latitude && first.longitude === second.longitude;
}

interface RoutineFormProps {
  routine: RoutineDtoOut | null;
  onSave: (fields: RoutineFields) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Créer ou modifier une routine : lieux, heure d'arrivée et jours, puis le trajet que la personne prend vraiment.
 * Si seuls le nom ou les jours changent, le trajet mémorisé est gardé ; sinon il faut en rechoisir un.
 */
export function RoutineForm({ routine, onSave, onCancel }: RoutineFormProps) {
  const profile = useRoutingProfile();
  const pair = usePlacePair({
    initialPlaces: routine ? { from: routine.origin, to: routine.destination } : undefined,
  });
  const { from, to } = pair.places;
  const [name, setName] = useState(routine?.name ?? "");
  const [arrivalTime, setArrivalTime] = useState(routine?.arrivalTime ?? DEFAULT_ARRIVAL_TIME);
  const [weekdays, setWeekdays] = useState(routine?.weekdays ?? WEEKDAYS_MONDAY_TO_FRIDAY);
  const [routes, setRoutes] = useState<TripRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const tripRequest = [from?.latitude, from?.longitude, to?.latitude, to?.longitude, arrivalTime, weekdays.join()].join("|");
  const hasCurrentResults = searchedFor === tripRequest;
  const selectedRoute = hasCurrentResults && selectedIndex !== null ? (routes[selectedIndex] ?? null) : null;
  const keepsStoredTrip =
    routine !== null &&
    arrivalTime === routine.arrivalTime &&
    isSamePlace(from, routine.origin) &&
    isSamePlace(to, routine.destination);

  const canSearch = Boolean(from && to && arrivalTime && weekdays.length > 0);
  const hasName = name.trim().length > 0;
  const canSave = hasName && canSearch && (selectedRoute !== null || keepsStoredTrip) && !saving;

  function toggleWeekday(weekday: number) {
    setWeekdays((current) => (current.includes(weekday) ? current.filter((day) => day !== weekday) : [...current, weekday]));
  }

  async function searchTrips() {
    if (!from || !to) return;
    setSearching(true);
    setSearchMessage(null);
    setSelectedIndex(null);
    const result = await tripsService.planTrip({
      origin: { latitude: from.latitude, longitude: from.longitude },
      destination: { latitude: to.latitude, longitude: to.longitude },
      profile,
      plannedTime: { dateTime: nextArrivalDateTime(weekdays, arrivalTime, Date.now()), mode: "arrival" },
    });
    setSearching(false);
    setSearchedFor(tripRequest);
    if (!result.isOk) {
      setRoutes([]);
      setSearchMessage("Le calcul des trajets a échoué. Réessaie dans un instant.");
      return;
    }
    setRoutes(result.data.transit);
    setSearchMessage(transitMessage(result.data));
  }

  function fieldsToSave(): RoutineFields | null {
    if (!from || !to) return null;
    const form = { name, origin: toCoordinates(from), destination: toCoordinates(to), arrivalTime, weekdays };
    if (selectedRoute) return toRoutineFields(form, selectedRoute);
    if (!routine) return null;
    return {
      ...form,
      name: name.trim(),
      weekdays: [...weekdays].sort((first, second) => first - second),
      usualDepartureTime: routine.usualDepartureTime,
      lineIds: routine.lineIds,
    };
  }

  async function save() {
    const fields = fieldsToSave();
    if (!fields) {
      setSaveError("Ce trajet ne peut pas devenir une routine : une de ses lignes n'est pas identifiée. Choisis-en un autre.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const saved = await onSave(fields);
    setSaving(false);
    if (!saved) setSaveError("L'enregistrement a échoué. Réessaie dans un instant.");
  }

  return (
    <GlassPanel as="section" aria-labelledby="formulaire-routine" className="flex flex-col gap-4 p-5">
      <h2 id="formulaire-routine" className="[font:var(--uf-time)]">
        {routine ? "Modifier la routine" : "Nouvelle routine"}
      </h2>

      <FormField label="Nom" value={name} maxLength={40} placeholder="Travail" onChange={(event) => setName(event.target.value)} />

      <PlaceFields pair={pair} />

      <FormField label="Arriver avant" type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} />

      <fieldset className="flex flex-col gap-2">
        <legend className="px-1 pb-1.5 [font:var(--uf-note)]">Jours</legend>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_WEEKDAYS.map((day) => (
            <ChoiceChip key={day.id} selected={weekdays.includes(day.id)} aria-label={day.full} onClick={() => toggleWeekday(day.id)}>
              {day.short}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>

      <Button variant="inset" disabled={!canSearch || searching} onClick={() => void searchTrips()}>
        {searching ? "Recherche des itinéraires…" : "Choisir mon itinéraire habituel"}
      </Button>

      <div aria-live="polite" className="flex flex-col gap-2">
        {hasCurrentResults && searchMessage && (
          <p className="uf-inset rounded-uf-inset px-4 py-3 [font:var(--uf-body)]">{searchMessage}</p>
        )}
        {hasCurrentResults && routes.length > 0 && (
          <>
            <p className="px-1 [font:var(--uf-note)] font-bold">Choisis ton itinéraire habituel</p>
            <ul className="flex flex-col gap-2">
              {routes.map((route, index) => (
                <li key={index}>
                  <RouteCard route={route} selected={index === selectedIndex} onSelect={() => setSelectedIndex(index)} showArrival />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {saveError && <p role="alert" className="[font:var(--uf-body)] font-bold">{saveError}</p>}

      <div className="flex items-center gap-2">
        <Button variant="primary" disabled={!canSave} onClick={() => void save()} className="flex-1">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="text" onClick={onCancel}>Annuler</Button>
      </div>
    </GlassPanel>
  );
}
