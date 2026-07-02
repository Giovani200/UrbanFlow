"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ChevronRight, Navigation, Leaf, Home, Target, Loader2 } from "lucide-react";
import { usersService } from "@/app/services/users.service";
import type { GetUserProfileDtoOut, UpdateMobilityProfileDtoIn } from "@/app/services/users.service";

const MODE_LABELS: Record<string, string> = {
  bike: "Vélo", scooter: "Trottinette", tram: "Tram",
  bus: "Bus", carpool: "Covoiturage", walk: "Marche",
};

const ALL_MODES = ["bike", "scooter", "tram", "bus", "carpool", "walk"] as const;

const PREF_CONFIG = [
  { key: "weightTime" as const, label: "Rapidité", color: "#3B82F6" },
  { key: "weightCarbon" as const, label: "Écologie", color: "#16A34A" },
  { key: "weightCost" as const, label: "Confort", color: "#F59E0B" },
];

const ADDRESSES = [
  { icon: Home, label: "Domicile", addr: "Non défini" },
  { icon: Target, label: "Travail", addr: "Non défini" },
];

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<GetUserProfileDtoOut | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [weightTime, setWeightTime] = useState(34);
  const [weightCarbon, setWeightCarbon] = useState(33);
  const [weightCost, setWeightCost] = useState(33);
  const [wheelchairAccess, setWheelchairAccess] = useState(false);
  const [avoidStairs, setAvoidStairs] = useState(false);
  type TransportMode = NonNullable<UpdateMobilityProfileDtoIn["preferredModes"]>[number];
  const [preferredModes, setPreferredModes] = useState<TransportMode[]>(["bike", "tram", "walk"]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    if (status === "authenticated") {
      usersService.getProfile().then((res) => {
        if (!res.isOk) return;
        setProfile(res.data);
        if (res.data.mobilityProfile) {
          const mp = res.data.mobilityProfile;
          setWeightTime(mp.weightTime);
          setWeightCarbon(mp.weightCarbon);
          setWeightCost(mp.weightCost);
          setWheelchairAccess(mp.wheelchairAccess);
          setAvoidStairs(mp.avoidStairs);
          setPreferredModes(mp.preferredModes as TransportMode[]);
        }
      });
    }
  }, [status, router]);

  async function handleSave() {
    setSaving(true);
    const res = await usersService.updateProfile({
      weightTime, weightCarbon, weightCost,
      wheelchairAccess, avoidStairs, preferredModes,
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

  if (status === "loading" || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-uf-bg">
        <Loader2 size={24} className="animate-spin text-uf-red" />
      </div>
    );
  }

  const prefs = [
    { ...PREF_CONFIG[0], val: weightTime },
    { ...PREF_CONFIG[1], val: weightCarbon },
    { ...PREF_CONFIG[2], val: weightCost },
  ];

  return (
    <div className="flex flex-col h-screen bg-uf-bg font-sans">
      <div className="bg-white border-b border-uf-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-uf-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-uf-text" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-uf-text">Mon profil</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        {/* Avatar + infos */}
        <div className="bg-white rounded-xl p-5 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-uf-red flex items-center justify-center shrink-0">
            <span className="text-[20px] font-bold text-white">
              {getInitials(profile.name, profile.email)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-uf-text">{profile.name ?? "Utilisateur"}</p>
            <p className="text-[13px] text-uf-text-secondary mt-0.5 truncate">{profile.email}</p>
          </div>
          <ChevronRight size={16} className="text-uf-text-secondary shrink-0" />
        </div>

        {/* Stats, placeholder jusqu'à F4 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Navigation size={14} className="text-uf-red" />
              <span className="text-[10px] font-medium text-uf-text-secondary">Trajets ce mois</span>
            </div>
            <p className="font-mono text-[20px] font-bold text-uf-text">—</p>
            <p className="text-[10px] text-uf-text-secondary mt-0.5">trajets</p>
          </div>
          <div className="bg-white rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Leaf size={14} className="text-uf-red" />
              <span className="text-[10px] font-medium text-uf-text-secondary">CO₂ économisé</span>
            </div>
            <p className="font-mono text-[20px] font-bold text-uf-text">—</p>
            <p className="text-[10px] text-uf-text-secondary mt-0.5">kg CO₂</p>
          </div>
        </div>

        {/* Préférences mobilité */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-uf-text">Préférences mobilité</p>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-[12px] text-uf-red font-medium">
                Modifier
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-[12px] text-uf-red font-semibold disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "Enregistrer"}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {prefs.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-uf-text-secondary">{p.label}</span>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: p.color }}>
                    {p.val}%
                  </span>
                </div>
                {editing ? (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={p.val}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (p.key === "weightTime") setWeightTime(v);
                      if (p.key === "weightCarbon") setWeightCarbon(v);
                      if (p.key === "weightCost") setWeightCost(v);
                    }}
                    className="w-full h-[5px] rounded-full appearance-none cursor-pointer accent-uf-red"
                    style={{ accentColor: p.color }}
                  />
                ) : (
                  <div className="h-[5px] bg-uf-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.val}%`, background: p.color }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-uf-border">
              <label className="flex items-center gap-2 text-[12px] text-uf-text-secondary">
                <input
                  type="checkbox"
                  checked={wheelchairAccess}
                  onChange={(e) => setWheelchairAccess(e.target.checked)}
                  className="accent-uf-red"
                />
                Accès PMR
              </label>
              <label className="flex items-center gap-2 text-[12px] text-uf-text-secondary">
                <input
                  type="checkbox"
                  checked={avoidStairs}
                  onChange={(e) => setAvoidStairs(e.target.checked)}
                  className="accent-uf-red"
                />
                Éviter escaliers
              </label>
            </div>
          )}

          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {(editing ? ALL_MODES : preferredModes).map((m) => {
              const active = preferredModes.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => editing && toggleMode(m)}
                  className={`px-2.5 py-0.5 rounded-[10px] text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-uf-red-light text-uf-red"
                      : "bg-uf-bg text-uf-text-secondary"
                  } ${editing ? "cursor-pointer" : ""}`}
                >
                  {MODE_LABELS[m] ?? m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Adresses favorites */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-uf-text">Adresses favorites</p>
            <button className="text-[12px] text-uf-red font-medium">+ Ajouter</button>
          </div>
          <div className="flex flex-col">
            {ADDRESSES.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 py-2.5 ${i < ADDRESSES.length - 1 ? "border-b border-uf-border" : ""}`}
              >
                <div className="w-[34px] h-[34px] rounded-[9px] bg-uf-red-light flex items-center justify-center shrink-0">
                  <a.icon size={15} className="text-uf-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-uf-text">{a.label}</p>
                  <p className="text-[11px] text-uf-text-secondary truncate">{a.addr}</p>
                </div>
                <ChevronRight size={13} className="text-uf-text-secondary shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
