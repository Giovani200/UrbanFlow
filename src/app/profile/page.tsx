"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Navigation, Leaf, Home, Target, Star } from "lucide-react";

const PREFS = [
  { key: "Rapidité", val: 40, color: "#3B82F6" },
  { key: "Écologie", val: 40, color: "#16A34A" },
  { key: "Confort",  val: 20, color: "#F59E0B" },
];

const ADDRESSES = [
  { icon: Home,   label: "Domicile", addr: "12 rue des Alpes, Grenoble" },
  { icon: Target, label: "Travail",  addr: "Place Victor Hugo, Grenoble" },
];

const STATS = [
  { icon: Navigation, label: "Trajets ce mois", val: "47",  unit: "trajets" },
  { icon: Leaf,       label: "CO₂ économisé",   val: "18.4", unit: "kg CO₂" },
];

const MODES = ["Vélo", "Bus", "Marche"];

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen bg-uf-bg font-sans">
      {/* Header */}
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
        {/* Avatar */}
        <div className="bg-white rounded-xl p-5 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-uf-red flex items-center justify-center shrink-0">
            <span className="text-[20px] font-bold text-white">TM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-uf-text">Thomas Martin</p>
            <p className="text-[13px] text-uf-text-secondary mt-0.5 truncate">thomas.martin@exemple.fr</p>
            <div className="inline-flex items-center gap-1 mt-1.5 bg-uf-red-light rounded-[10px] px-2 py-0.5">
              <Star size={10} className="text-uf-red" />
              <span className="text-[10px] font-semibold text-uf-red">Membre Premium</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-uf-text-secondary shrink-0" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <s.icon size={14} className="text-uf-red" />
                <span className="text-[10px] font-medium text-uf-text-secondary">{s.label}</span>
              </div>
              <p className="font-mono text-[20px] font-bold text-uf-text">{s.val}</p>
              <p className="text-[10px] text-uf-text-secondary mt-0.5">{s.unit}</p>
            </div>
          ))}
        </div>

        {/* Préférences mobilité */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-uf-text">Préférences mobilité</p>
            <button className="text-[12px] text-uf-red">Modifier</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {PREFS.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-uf-text-secondary">{p.key}</span>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: p.color }}>{p.val}%</span>
                </div>
                <div className="h-[5px] bg-uf-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.val}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {MODES.map((m) => (
              <span key={m} className="px-2.5 py-0.5 bg-uf-red-light rounded-[10px] text-[11px] font-medium text-uf-red">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Adresses favorites */}
        <div className="bg-white rounded-xl p-3.5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[13px] font-semibold text-uf-text">Adresses favorites</p>
            <button className="text-[12px] text-uf-red">+ Ajouter</button>
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
