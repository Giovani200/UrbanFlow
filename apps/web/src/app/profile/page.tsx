"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { ArrowLeft, ChevronRight, Navigation, Leaf, MapPin, Trash2, Loader2 } from "lucide-react";
import { usersService } from "@/app/services/users.service";
import type { GetUserProfileDtoOut, UpdatePreferencesDtoIn, FavoriteAddress } from "@/app/services/users.service";
import { useCarbonSummary } from "@/app/hooks/useCarbonSummary";
import { useGeocoding } from "@/app/hooks/useGeocoding";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import { Modal } from "@/app/components/ui/Modal";
import { MODE_META, MODE_FALLBACK } from "@/app/lib/mode-meta";

const ALL_MODES = ["bike", "scooter", "tram", "bus", "walk"] as const;

const PREF_CONFIG = [
  { key: "weightTime" as const, label: "Rapidité", color: "#3B82F6" },
  { key: "weightCarbon" as const, label: "Écologie", color: "#16A34A" },
];

function formatKg(grams: number): string {
  return (grams / 1000).toFixed(1).replace(".", ",");
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useAuth();
  const { summary } = useCarbonSummary("month");
  const [profile, setProfile] = useState<GetUserProfileDtoOut | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [weightTime, setWeightTime] = useState(34);
  const [weightCarbon, setWeightCarbon] = useState(33);
  const [wheelchairAccess, setWheelchairAccess] = useState(false);
  const [avoidStairs, setAvoidStairs] = useState(false);
  type TransportMode = NonNullable<UpdatePreferencesDtoIn["preferredModes"]>[number];
  const [preferredModes, setPreferredModes] = useState<TransportMode[]>(["bike", "tram", "walk"]);
  const [monthlyGoalKg, setMonthlyGoalKg] = useState<number | null>(null);

  const [addresses, setAddresses] = useState<FavoriteAddress[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [pickedAddress, setPickedAddress] = useState<GeocodingResult | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const geocodingResults = useGeocoding(pickedAddress ? "" : addressQuery);

  const [hasPassword, setHasPassword] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    if (status === "authenticated") {
      usersService.getProfile().then((res) => {
        if (!res.isOk) return;
        setProfile(res.data);
        setHasPassword(res.data.hasPassword);
        setNameDraft(res.data.name ?? "");
        if (res.data.preferences) {
          const mp = res.data.preferences;
          const total = mp.weightTime + mp.weightCarbon;
          const timePct = total === 0 ? 50 : Math.round((mp.weightTime / total) * 100);
          setWeightTime(timePct);
          setWeightCarbon(100 - timePct);
          setWheelchairAccess(mp.wheelchairAccess);
          setAvoidStairs(mp.avoidStairs);
          setPreferredModes(mp.preferredModes.filter((m): m is TransportMode => (ALL_MODES as readonly string[]).includes(m)));
          setMonthlyGoalKg(mp.monthlyGoalKg);
        }
      });

      usersService.listAddresses().then((res) => {
        if (res.isOk) setAddresses(res.data);
      });
    }
  }, [status, router]);

  async function handleSave() {
    setSaving(true);
    const res = await usersService.updateProfile({
      weightTime, weightCarbon,
      wheelchairAccess, avoidStairs, preferredModes,
      monthlyGoalKg,
    });
    setSaving(false);
    if (res.isOk) {
      setEditing(false);
    }
  }

  function toggleMode(mode: TransportMode) {
    setPreferredModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  }

  function resetAddressForm() {
    setAddingAddress(false);
    setNewLabel("");
    setAddressQuery("");
    setPickedAddress(null);
  }

  async function handleAddAddress() {
    if (!pickedAddress || !newLabel.trim()) return;
    setSavingAddress(true);
    const res = await usersService.createAddress({
      label: newLabel.trim(),
      address: pickedAddress.label,
      latitude: pickedAddress.latitude,
      longitude: pickedAddress.longitude,
    });
    setSavingAddress(false);
    if (res.isOk) {
      setAddresses((prev) => [...prev, res.data]);
      resetAddressForm();
    }
  }

  async function handleDeleteAddress(id: string) {
    const res = await usersService.deleteAddress(id);
    if (res.isOk) setAddresses((prev) => prev.filter((address) => address.id !== id));
  }

  function redistributeWeights(changedKey: "weightTime" | "weightCarbon", value: number) {
    if (changedKey === "weightTime") {
      setWeightTime(value);
      setWeightCarbon(100 - value);
    } else {
      setWeightCarbon(value);
      setWeightTime(100 - value);
    }
  }

  async function handleSaveName() {
    if (nameDraft.trim().length < 2) return;
    setSavingName(true);
    const res = await usersService.updateAccount({ name: nameDraft.trim() });
    setSavingName(false);
    if (res.isOk) {
      setProfile((prev) => (prev ? { ...prev, name: res.data.name } : prev));
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("8 caractères minimum");
      return;
    }
    setSavingPassword(true);
    const res = await usersService.changePassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (res.isOk) {
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setPasswordError("Mot de passe actuel incorrect");
    }
  }

  if (status === "loading" || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const prefs = [
    { ...PREF_CONFIG[0], val: weightTime },
    { ...PREF_CONFIG[1], val: weightCarbon },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg font-sans">
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">Mon profil</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        {/* Avatar + infos → ouvre la modale compte */}
        <button
          type="button"
          onClick={() => {
            setNameDraft(profile.name ?? "");
            setAccountOpen(true);
          }}
          className="bg-white rounded-xl p-5 flex items-center gap-3.5 w-full text-left"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[20px] font-bold text-white">
              {getInitials(profile.name, profile.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-ink">{profile.name ?? "Utilisateur"}</p>
            <p className="text-[13px] text-text-2 mt-0.5 truncate">{profile.email}</p>
          </div>
          <ChevronRight size={16} className="text-text-2 shrink-0" />
        </button>

        {/* Stats, placeholder jusqu'à F4 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Navigation size={14} className="text-primary" />
              <span className="text-[10px] font-medium text-text-2">Trajets ce mois</span>
            </div>
            <p className="font-mono text-[20px] font-bold text-ink">
              {summary ? summary.tripCount : "—"}
            </p>
            <p className="text-[10px] text-text-2 mt-0.5">trajets</p>
          </div>
          <div className="bg-white rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Leaf size={14} className="text-primary" />
              <span className="text-[10px] font-medium text-text-2">CO₂ économisé</span>
            </div>
            <p className="font-mono text-[20px] font-bold text-ink">
              {summary ? formatKg(summary.totalSavedGrams) : "—"}
            </p>
            <p className="text-[10px] text-text-2 mt-0.5">kg CO₂</p>
          </div>
        </div>

        {/* Préférences mobilité */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-ink">Préférences mobilité</p>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-[12px] text-primary font-medium">
                Modifier
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-[12px] text-primary font-semibold disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "Enregistrer"}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {prefs.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-text-2">{p.label}</span>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: p.color }}>
                    {p.val}%
                  </span>
                </div>
                {editing ? (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    aria-label={p.label}
                    value={p.val}
                    onChange={(e) => redistributeWeights(p.key, Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: p.color }}
                  />
                ) : (
                  <div className="h-[5px] bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.val}%`, background: p.color }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <label className="flex items-center gap-2 text-[12px] text-text-2">
                <input
                  type="checkbox"
                  checked={wheelchairAccess}
                  onChange={(e) => setWheelchairAccess(e.target.checked)}
                  className="accent-primary"
                />
                Accès PMR
              </label>
              <label className="flex items-center gap-2 text-[12px] text-text-2">
                <input
                  type="checkbox"
                  checked={avoidStairs}
                  onChange={(e) => setAvoidStairs(e.target.checked)}
                  className="accent-primary"
                />
                Éviter escaliers
              </label>
            </div>
          )}

          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {(editing ? ALL_MODES : preferredModes).map((m) => {
              const active = preferredModes.includes(m);
              const meta = MODE_META[m] ?? MODE_FALLBACK;
              const Icon = meta.icon;
              return (
                <button
                  key={m}
                  onClick={() => editing && toggleMode(m)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[10px] text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-primary-tint text-primary"
                      : "bg-bg text-text-2"
                  } ${editing ? "cursor-pointer" : ""}`}
                >
                  <Icon size={12} style={{ color: meta.color }} />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <span className="text-[12px] text-text-2">Objectif carbone mensuel</span>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  aria-label="Objectif carbone mensuel en kilogrammes"
                  value={monthlyGoalKg ?? ""}
                  onChange={(event) =>
                    setMonthlyGoalKg(event.target.value === "" ? null : Number(event.target.value))
                  }
                  placeholder="—"
                  className="w-16 text-right text-[12px] font-mono border border-border rounded-md px-2 py-1"
                />
                <span className="text-[12px] text-text-2">kg</span>
              </div>
            ) : (
              <span className="text-[12px] font-mono font-semibold text-ink">
                {monthlyGoalKg != null ? `${monthlyGoalKg} kg` : "Non défini"}
              </span>
            )}
          </div>
        </div>

        {/* Adresses favorites */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-ink">Adresses favorites</p>
            {!addingAddress && (
              <button
                onClick={() => setAddingAddress(true)}
                className="text-[12px] text-primary font-medium"
              >
                + Ajouter
              </button>
            )}
          </div>

          {addresses.length === 0 && !addingAddress && (
            <p className="text-[12px] text-text-2 py-1.5">Aucune adresse enregistrée.</p>
          )}

          <div className="flex flex-col">
            {addresses.map((address, index) => (
              <div
                key={address.id}
                className={`flex items-center gap-2.5 py-2.5 ${index < addresses.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="w-[34px] h-[34px] rounded-[9px] bg-primary-tint flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{address.label}</p>
                  <p className="text-[11px] text-text-2 truncate">{address.address}</p>
                </div>
                <button
                  onClick={() => handleDeleteAddress(address.id)}
                  aria-label={`Supprimer ${address.label}`}
                  className="w-8 h-8 flex items-center justify-center text-text-2 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {addingAddress && (
            <div className="mt-2 pt-3 border-t border-border flex flex-col gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                placeholder="Nom (ex. Pharmacie de maman)"
                aria-label="Nom de l'adresse favorite"
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
              />

              {pickedAddress ? (
                <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <span className="flex-1 text-[12px] text-ink truncate">{pickedAddress.label}</span>
                  <button
                    onClick={() => setPickedAddress(null)}
                    className="text-[11px] text-primary font-medium shrink-0"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(event) => setAddressQuery(event.target.value)}
                    placeholder="Rechercher une adresse…"
                    aria-label="Rechercher une adresse"
                    className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
                  />
                  {geocodingResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-border rounded-lg overflow-hidden shadow-sm">
                      {geocodingResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setPickedAddress(result);
                            setAddressQuery("");
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] text-ink border-b border-border last:border-0"
                        >
                          {result.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAddAddress}
                  disabled={savingAddress || !pickedAddress || !newLabel.trim()}
                  className="flex-1 bg-primary text-white rounded-lg py-2 text-[13px] font-semibold disabled:opacity-50"
                >
                  {savingAddress ? "Ajout…" : "Enregistrer"}
                </button>
                <button
                  onClick={resetAddressForm}
                  className="px-4 rounded-lg border border-border text-[13px] text-text-2"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <Modal
          open={accountOpen}
          onOpenChange={(open) => {
            setAccountOpen(open);
            if (!open) {
              setChangingPassword(false);
              setPasswordError(null);
              setCurrentPassword("");
              setNewPassword("");
              setNameDraft(profile.name ?? "");
            }
          }}
          title="Mon compte"
          description={profile.email}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-2">Nom</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  aria-label="Nom du compte"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
                />
                <button
                  onClick={handleSaveName}
                  disabled={
                    savingName ||
                    nameDraft.trim().length < 2 ||
                    nameDraft.trim() === (profile.name ?? "")
                  }
                  className="px-4 rounded-lg bg-primary text-white text-[13px] font-semibold disabled:opacity-50"
                >
                  {savingName ? "…" : "OK"}
                </button>
              </div>
            </div>

            {hasPassword && (
              <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-text-2">Mot de passe</span>
                  {!changingPassword && (
                    <button
                      onClick={() => setChangingPassword(true)}
                      className="text-[12px] text-primary font-medium"
                    >
                      Modifier
                    </button>
                  )}
                </div>
                {changingPassword && (
                  <div className="flex flex-col gap-2 mt-1">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Mot de passe actuel"
                      aria-label="Mot de passe actuel"
                      className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Nouveau mot de passe (8 car. min)"
                      aria-label="Nouveau mot de passe"
                      className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
                    />
                    {passwordError && <p role="alert" className="text-[11px] text-red-600">{passwordError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={savingPassword || !currentPassword || !newPassword}
                        className="flex-1 bg-primary text-white rounded-lg py-2 text-[13px] font-semibold disabled:opacity-50"
                      >
                        {savingPassword ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button
                        onClick={() => {
                          setChangingPassword(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setPasswordError(null);
                        }}
                        className="px-4 rounded-lg border border-border text-[13px] text-text-2"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
