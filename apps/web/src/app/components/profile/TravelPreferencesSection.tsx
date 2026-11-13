"use client";

import { useState } from "react";
import { LAST_DEPARTURE_SETTINGS } from "@urbanflow/app-front-back-lib";
import { Button } from "@/app/components/ui/Button";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { formatDistance, formatDuration } from "@/app/lib/format";
import { usersService, type StoredPreferences } from "@/app/services/users.service";

interface LastDepartureSettingProps {
  label: string;
  shownValue: string;
  editing: boolean;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}

/** Un réglage du dernier départ : curseur borné en modification (une valeur refusée par l'API est impossible), valeur seule sinon. */
function LastDepartureSetting({ label, shownValue, editing, value, range, onChange }: LastDepartureSettingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-3 [font:var(--uf-note)]">
        <span>{label}</span>
        <span className="shrink-0 tabular-nums">{shownValue}</span>
      </div>
      {editing && (
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          aria-label={label}
          aria-valuetext={shownValue}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full cursor-pointer accent-(--uf-ink)"
        />
      )}
    </div>
  );
}

/** Façon de se déplacer : accessibilité, objectif carbone, dernier retour. Un seul enregistrement pour tout. */
export function TravelPreferencesSection({ preferences }: { preferences: StoredPreferences | null }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wheelchairAccess, setWheelchairAccess] = useState(preferences?.wheelchairAccess ?? false);
  const [monthlyGoalKg, setMonthlyGoalKg] = useState<number | null>(preferences?.monthlyGoalKg ?? null);
  const [distanceMeters, setDistanceMeters] = useState<number>(
    preferences?.lastDepartureDistanceMeters ?? LAST_DEPARTURE_SETTINGS.distanceMeters.default,
  );
  const [windowMinutes, setWindowMinutes] = useState<number>(
    preferences?.lastDepartureWindowMinutes ?? LAST_DEPARTURE_SETTINGS.windowMinutes.default,
  );

  async function handleSave() {
    setSaving(true);
    const result = await usersService.updateProfile({
      wheelchairAccess,
      monthlyGoalKg,
      lastDepartureDistanceMeters: distanceMeters,
      lastDepartureWindowMinutes: windowMinutes,
    });
    setSaving(false);
    if (result.isOk) setEditing(false);
  }

  return (
    <GlassPanel as="section" aria-labelledby="ta-facon" className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 id="ta-facon" className="[font:var(--uf-time)]">Ta façon de te déplacer</h2>
        {editing ? (
          <Button variant="primary" onClick={handleSave} disabled={saving} className="h-11">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        ) : (
          <Button variant="inset" onClick={() => setEditing(true)}>
            Modifier
          </Button>
        )}
      </div>

      {editing && (
        <label className="flex min-h-11 items-center gap-3 [font:var(--uf-body)] font-medium">
          <input
            type="checkbox"
            checked={wheelchairAccess}
            onChange={(event) => setWheelchairAccess(event.target.checked)}
            className="size-5 accent-(--uf-ink)"
          />
          Je me déplace en fauteuil roulant
        </label>
      )}

      <div className="uf-inset flex min-h-11 items-center justify-between gap-3 rounded-uf-inset px-4 py-2">
        {editing ? (
          <label htmlFor="objectif-carbone" className="[font:var(--uf-note)]">
            Objectif carbone du mois
          </label>
        ) : (
          <span className="[font:var(--uf-note)]">Objectif carbone du mois</span>
        )}
        {editing ? (
          <span className="flex items-center gap-1.5 [font:var(--uf-note)]">
            <input
              id="objectif-carbone"
              type="number"
              min={0}
              value={monthlyGoalKg ?? ""}
              onChange={(event) => setMonthlyGoalKg(event.target.value === "" ? null : Number(event.target.value))}
              className="min-h-11 w-20 rounded-uf-chip border border-uf-glass-edge bg-transparent px-3 text-right tabular-nums outline-none"
            />
            kg
          </span>
        ) : (
          <span className="[font:var(--uf-note)] tabular-nums">
            {monthlyGoalKg != null ? `${monthlyGoalKg} kg` : "Non défini"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="[font:var(--uf-note)] font-bold">Dernier retour le soir</p>
        <LastDepartureSetting
          label="À partir de cette distance de chez moi"
          shownValue={formatDistance(distanceMeters)}
          editing={editing}
          value={distanceMeters}
          range={LAST_DEPARTURE_SETTINGS.distanceMeters}
          onChange={setDistanceMeters}
        />
        <LastDepartureSetting
          label="Affiché avant le départ"
          shownValue={formatDuration(windowMinutes * 60)}
          editing={editing}
          value={windowMinutes}
          range={LAST_DEPARTURE_SETTINGS.windowMinutes}
          onChange={setWindowMinutes}
        />
      </div>
    </GlassPanel>
  );
}
