"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ChoiceChip } from "@/app/components/ui/ChoiceChip";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { DEFAULT_PREFERRED_MODES, PREFERRED_MODES, keepKnownModes, type PreferredMode } from "@/app/lib/preferred-modes";
import { usersService, type GetUserProfileDtoOut } from "@/app/services/users.service";

type StoredPreferences = GetUserProfileDtoOut["preferences"];

/** Part du temps dans le couple temps et carbone, en pourcentage (50 si les deux poids sont nuls). */
function timeShareOf(preferences: StoredPreferences): number {
  if (!preferences) return 50;
  const total = preferences.weightTime + preferences.weightCarbon;
  return total === 0 ? 50 : Math.round((preferences.weightTime / total) * 100);
}

/** Façon de se déplacer : rapidité contre écologie, modes préférés, accessibilité, objectif carbone. Un seul enregistrement pour tout. */
export function TravelPreferencesSection({ preferences }: { preferences: StoredPreferences }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeShare, setTimeShare] = useState(() => timeShareOf(preferences));
  const [wheelchairAccess, setWheelchairAccess] = useState(preferences?.wheelchairAccess ?? false);
  const [avoidStairs, setAvoidStairs] = useState(preferences?.avoidStairs ?? false);
  const [preferredModes, setPreferredModes] = useState<PreferredMode[]>(() =>
    preferences ? keepKnownModes(preferences.preferredModes) : DEFAULT_PREFERRED_MODES,
  );
  const [monthlyGoalKg, setMonthlyGoalKg] = useState<number | null>(preferences?.monthlyGoalKg ?? null);

  const weights = [
    { key: "time", label: "Rapidité", value: timeShare, onChange: (value: number) => setTimeShare(value) },
    { key: "carbon", label: "Écologie", value: 100 - timeShare, onChange: (value: number) => setTimeShare(100 - value) },
  ];

  function toggleMode(mode: PreferredMode) {
    setPreferredModes((previous) => (previous.includes(mode) ? previous.filter((kept) => kept !== mode) : [...previous, mode]));
  }

  async function handleSave() {
    setSaving(true);
    const result = await usersService.updateProfile({
      weightTime: timeShare,
      weightCarbon: 100 - timeShare,
      wheelchairAccess,
      avoidStairs,
      preferredModes,
      monthlyGoalKg,
    });
    setSaving(false);
    if (result.isOk) setEditing(false);
  }

  const shownModes = editing ? PREFERRED_MODES : preferredModes;

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

      <div className="flex flex-col gap-3">
        {weights.map((weight) => (
          <div key={weight.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between [font:var(--uf-note)]">
              <span>{weight.label}</span>
              <span className="tabular-nums">{weight.value} %</span>
            </div>
            {editing ? (
              <input
                type="range"
                min={0}
                max={100}
                aria-label={weight.label}
                value={weight.value}
                onChange={(event) => weight.onChange(Number(event.target.value))}
                className="h-11 w-full cursor-pointer accent-(--uf-ink)"
              />
            ) : (
              <div className="uf-inset h-2 overflow-hidden rounded-full" aria-hidden="true">
                <div className="h-full rounded-full bg-uf-ink" style={{ width: `${weight.value}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="[font:var(--uf-note)]">Modes préférés</p>
        {shownModes.length === 0 ? (
          <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">Aucun mode choisi.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shownModes.map((mode) => {
              const meta = MODE_META[mode] ?? MODE_FALLBACK;
              const Icon = meta.icon;
              const selected = preferredModes.includes(mode);
              return editing ? (
                <ChoiceChip key={mode} selected={selected} onClick={() => toggleMode(mode)}>
                  <Icon size={16} aria-hidden="true" />
                  {meta.label}
                </ChoiceChip>
              ) : (
                <span key={mode} className="uf-inset inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 [font:var(--uf-note)]">
                  <Icon size={16} aria-hidden="true" style={{ color: meta.color }} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <div className="flex flex-col">
          <label className="flex min-h-11 items-center gap-3 [font:var(--uf-body)] font-medium">
            <input
              type="checkbox"
              checked={wheelchairAccess}
              onChange={(event) => setWheelchairAccess(event.target.checked)}
              className="size-5 accent-(--uf-ink)"
            />
            Je me déplace en fauteuil roulant
          </label>
          <label className="flex min-h-11 items-center gap-3 [font:var(--uf-body)] font-medium">
            <input
              type="checkbox"
              checked={avoidStairs}
              onChange={(event) => setAvoidStairs(event.target.checked)}
              className="size-5 accent-(--uf-ink)"
            />
            Éviter les escaliers
          </label>
        </div>
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
    </GlassPanel>
  );
}
